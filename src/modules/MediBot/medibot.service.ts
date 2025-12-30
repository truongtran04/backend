
import { BadRequestException, Injectable, Logger, OnModuleInit, ServiceUnavailableException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, from, map, filter, finalize, switchMap, of, catchError } from 'rxjs';


import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChatPromptTemplate, MessagesPlaceholder, PromptTemplate } from '@langchain/core/prompts';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { createHistoryAwareRetriever } from 'langchain/chains/history_aware_retriever';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression';
import { LLMChainExtractor } from 'langchain/retrievers/document_compressors/chain_extract';
import { MultiQueryRetriever } from 'langchain/retrievers/multi_query';
import { ChatMessageHistory } from "@langchain/community/stores/message/in_memory";


export type SseMessage = { type: 'chunk' | 'sources' | 'error'; data: any };

const VECTOR_STORE_PATH = 'vectorstore/db_faiss';
const DATA_PATH = 'ViMedical Disease/Corpus';

@Injectable()
export class MediBotService implements OnModuleInit {
  private readonly logger = new Logger(MediBotService.name);
  private vectorStore: FaissStore;
  private llm: ChatOpenAI;
  private smallLlm: ChatOpenAI;
  private conversationalChain: RunnableWithMessageHistory<any, any>;
 
  private messageHistories: Map<string, ChatMessageHistory>; 
  private initializationError: string | null = null;

  constructor(private readonly configService: ConfigService) {}
  
  async onModuleInit() {
    try {
      this.logger.log('Đang khởi tạo MediBot Service...');
  
      this.messageHistories = new Map(); // Khởi tạo Map cho lịch sử hội thoại
      await this.initializeChain();
      this.logger.log('MediBot Service đã được khởi tạo thành công.');
    } catch (error) {
      if ((error as any).message?.includes('429') || (error as any).status === 429 || (error as any).code === 'insufficient_quota') {
        this.logger.warn('⚠️ CẢNH BÁO: Hết hạn ngạch OpenAI (Quota Exceeded). Hệ thống sẽ chuyển sang chế độ trả lời giả lập (Mock Mode).');
        this.initializationError = 'Chức năng chat tạm thời không khả dụng do hết hạn ngạch API.';
      } else {
        this.logger.error('Lỗi nghiêm trọng khi khởi tạo service:', error);
        this.initializationError = 'Hệ thống đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.';
      }
    }
  }

  private async initializeChain() {
    const embeddings = this.createEmbeddings();
    this.llm = this.createLLM();
    this.smallLlm = this.createSmallLLM(); // Tạo một LLM nhỏ hơn cho các tác vụ phụ
    this.vectorStore = await this.getOrCreateVectorStore(embeddings);
    this.logger.log('Vector Store đã sẵn sàng.');

    const vectorStoreRetriever = this.vectorStore.asRetriever();
    this.logger.log('Đã tạo vectorStoreRetriever.');

    
    this.logger.log('Đang khởi tạo MultiQueryRetriever...');
    const multiQueryRetriever = MultiQueryRetriever.fromLLM({
      llm: this.smallLlm,
      retriever: vectorStoreRetriever,
    });
    this.logger.log('MultiQueryRetriever đã sẵn sàng.');

    // Cải tiến 2: Sử dụng LLM nhỏ hơn cho việc nén tài liệu
    this.logger.log('Đang khởi tạo Document Compressor...');
    const documentCompressor = LLMChainExtractor.fromLLM(this.smallLlm);
    this.logger.log('Document Compressor đã sẵn sàng.');

    // Cải tiến 3: Bọc retriever đã cải tiến ở trên với Contextual Compression
    this.logger.log('Đang khởi tạo ContextualCompressionRetriever...');
    const contextualRetriever = new ContextualCompressionRetriever({
      baseCompressor: documentCompressor,
      baseRetriever: multiQueryRetriever,
    });
    this.logger.log('ContextualCompressionRetriever đã sẵn sàng.');

    // Bước 1. Tạo chuỗi để viết lại câu hỏi dựa trên lịch sử trò chuyện
    this.logger.log('Đang tạo historyAwareRetriever...');
    const historyAwareRetriever = await createHistoryAwareRetriever({
      llm: this.llm, // Vẫn dùng LLM chính để hiểu ngữ cảnh lịch sử
      retriever: contextualRetriever, // Sử dụng retriever đã được cải tiến
      rephrasePrompt: this.createHistoryAwarePrompt(),
    });
    this.logger.log('historyAwareRetriever đã sẵn sàng.');

    // Bước 2. Tạo chuỗi để trả lời câu hỏi dựa trên context
    this.logger.log('Đang tạo questionAnsweringChain...');
    const questionAnsweringChain = await createStuffDocumentsChain({
      llm: this.llm, // Dùng LLM chính, mạnh mẽ nhất để tạo câu trả lời cuối cùng
      prompt: this.createQuestionAnsweringPrompt(),
      outputParser: new StringOutputParser(),
    });
    this.logger.log('questionAnsweringChain đã sẵn sàng.');

    // Bước 3. Kết hợp 2 chuỗi trên thành một chuỗi truy xuất hoàn chỉnh
    this.logger.log('Đang tạo retrievalChain...');
    const retrievalChain = await createRetrievalChain({
      retriever: historyAwareRetriever,
      combineDocsChain: questionAnsweringChain,
    });
    this.logger.log('retrievalChain đã sẵn sàng.');

    // Bước 4. Bọc chuỗi truy xuất với trình quản lý lịch sử
    this.conversationalChain = new RunnableWithMessageHistory({
      runnable: retrievalChain,
      getMessageHistory: (sessionId) => this.getHistoryForSession(sessionId),
      inputMessagesKey: 'input',
      historyMessagesKey: 'chat_history',
      // Trả về cả câu trả lời và tài liệu nguồn
      outputMessagesKey: 'answer',
    });
    this.logger.log('Conversational Chain đã được khởi tạo hoàn chỉnh.');
  }

  private getHistoryForSession(sessionId: string): ChatMessageHistory {
    // Lấy lịch sử từ Map, nếu chưa có thì tạo mới
    if (!this.messageHistories.has(sessionId)) {
      this.messageHistories.set(sessionId, new ChatMessageHistory());
    }
    return this.messageHistories.get(sessionId)!;
  }

  private createHistoryAwarePrompt(): ChatPromptTemplate {
    return ChatPromptTemplate.fromMessages([
      new MessagesPlaceholder('chat_history'),
      ['user', '{input}'],
      [
        'system',
        'Dựa vào lịch sử cuộc trò chuyện và câu hỏi mới nhất của người dùng, hãy viết lại câu hỏi đó thành một câu truy vấn tìm kiếm độc lập, đầy đủ ngữ cảnh y khoa để tra cứu trong cơ sở dữ liệu bệnh học. Không trả lời câu hỏi, chỉ viết lại câu hỏi.',
      ],
    ]);
  }

  private createEmbeddings(): OpenAIEmbeddings {
    return new OpenAIEmbeddings({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  private createSmallLLM(): ChatOpenAI {
    // Ví dụ: sử dụng cùng model nhưng có thể là một model khác rẻ hơn trong tương lai
    // Hoặc bạn có thể tinh chỉnh các tham số khác nếu cần
    return new ChatOpenAI({
      modelName: 'gpt-3.5-turbo', // Có thể thay bằng một model rẻ hơn khi có
      temperature: 0, // Nhiệt độ = 0 cho các tác vụ có tính quyết định cao
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  private createLLM(): ChatOpenAI {
    return new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7,
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      streaming: true, // Bật chế độ streaming
    });
  }

  private createQuestionAnsweringPrompt(): ChatPromptTemplate {
    const systemTemplate = `Bạn là MediBot, một trợ lý y tế ảo thông minh và tận tâm.
    Nhiệm vụ của bạn là hỗ trợ người dùng tra cứu thông tin về bệnh học dựa trên dữ liệu được cung cấp.

    HƯỚNG DẪN TRẢ LỜI:
    1. Chỉ sử dụng thông tin trong phần "Context" dưới đây để trả lời. Tuyệt đối không bịa đặt thông tin.
    2. Nếu thông tin không có trong Context, hãy lịch sự nói rằng bạn chưa có dữ liệu về vấn đề này và khuyên người dùng nên gặp bác sĩ.
    3. Trình bày câu trả lời rõ ràng, mạch lạc, có thể sử dụng gạch đầu dòng cho các triệu chứng hoặc phương pháp điều trị.
    4. Luôn giữ thái độ khách quan, chuyên nghiệp nhưng đồng cảm.
    5. CẢNH BÁO QUAN TRỌNG: Cuối câu trả lời, hãy luôn thêm câu: "Thông tin chỉ mang tính chất tham khảo. Vui lòng tham vấn ý kiến bác sĩ chuyên khoa để có chẩn đoán chính xác."

    Context: {context}`;
    return ChatPromptTemplate.fromMessages([
      ['system', systemTemplate],
      new MessagesPlaceholder('chat_history'),
      ['user', '{input}'],
    ]);
  }

  private async getOrCreateVectorStore(embeddings: OpenAIEmbeddings): Promise<FaissStore> {
    try {
      this.logger.log(`Đang tải Vector Store từ: ${VECTOR_STORE_PATH}...`);
      const vectorStore = await FaissStore.load(VECTOR_STORE_PATH, embeddings);
      this.logger.log('Tải Vector Store thành công.');
      return vectorStore;
    } catch (e) {
      this.logger.warn('Không tìm thấy Vector Store, đang tiến hành tạo mới...');
      return this.createAndSaveVectorStore(embeddings);
    }
  }

  private async createAndSaveVectorStore(embeddings: OpenAIEmbeddings): Promise<FaissStore> {
    this.logger.log(`Đang tải tài liệu từ thư mục: ${DATA_PATH}`);
    const loader = new DirectoryLoader(DATA_PATH, {
      '.pdf': (path) => new PDFLoader(path),
      '.html': (path) => new TextLoader(path),
      '.txt': (path) => new TextLoader(path),
    });
    const docs = await loader.load();
    this.logger.log(`Đã tải ${docs.length} tài liệu.`);


    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200, // Tăng overlap để giữ ngữ cảnh tốt hơn cho các thuật ngữ y khoa
    });
    const splitDocs = await textSplitter.splitDocuments(docs);
    this.logger.log(`Tài liệu đã được chia thành ${splitDocs.length} đoạn.`);


    this.logger.log('Đang tạo vector embeddings và chỉ mục FAISS...');
    const vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);
    await vectorStore.save(VECTOR_STORE_PATH);
    this.logger.log(`Đã tạo và lưu trữ vector store mới tại: ${VECTOR_STORE_PATH}`);


    return vectorStore;
  }

  private validateAndSanitizeInput(query: string): string {
    if (!query) {
      throw new BadRequestException('Câu hỏi không được để trống.');
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length === 0) {
      throw new BadRequestException('Câu hỏi không được chỉ chứa khoảng trắng.');
    }

    // Giới hạn độ dài câu hỏi để tránh lạm dụng và chi phí cao
    const MAX_QUERY_LENGTH = 500;
    if (trimmedQuery.length > MAX_QUERY_LENGTH) {
      throw new BadRequestException(`Câu hỏi quá dài. Vui lòng giữ câu hỏi dưới ${MAX_QUERY_LENGTH} ký tự.`);
    }

    // Các bước làm sạch khác có thể được thêm vào đây, ví dụ:
    // - Loại bỏ các ký tự đặc biệt không cần thiết
    // - Chuyển thành chữ thường (tùy trường hợp)

    return trimmedQuery;
  }

  getMetrics() {
    return {
      status: 'active',
      timestamp: new Date(),
      uptime: process.uptime(),
    };
  }

  async askQuestionStream(query: string, conversationId: string): Promise<Observable<SseMessage>> {

    const sanitizedQuery = this.validateAndSanitizeInput(query);

    this.logger.log(`Nhận câu hỏi đã làm sạch cho session ${conversationId}: "${sanitizedQuery}"`);

    if (this.initializationError) {
      this.logger.warn(`Service chưa sẵn sàng: ${this.initializationError}. Trả về phản hồi giả lập.`);
      return from([
        { type: 'chunk', data: '⚠️ **Hệ thống**: Kết nối OpenAI tạm thời gián đoạn do hết hạn mức (Quota Exceeded). ' },
        { type: 'chunk', data: 'Đây là tin nhắn tự động giúp bạn tiếp tục kiểm tra giao diện ứng dụng.\n\n' },
        { type: 'chunk', data: `Bạn vừa hỏi: "${sanitizedQuery}"` },
        { type: 'sources', data: ['Mock Data Source'] }
      ] as SseMessage[]);
    }

    if (!this.conversationalChain) {
      this.logger.error('Chuỗi hội thoại chưa được khởi tạo.');
      throw new ServiceUnavailableException('Hệ thống chưa sẵn sàng, vui lòng thử lại sau.'); //
    }

    

    this.logger.log(`Cache miss cho session ${conversationId}, query: "${sanitizedQuery}". Đang xử lý truy vấn...`); //

    // 2. Xử lý truy vấn bằng chuỗi hội thoại và lưu vào cache
    return from(
      this.conversationalChain.stream(
        { input: sanitizedQuery },
        { configurable: { sessionId: conversationId } }
      )
    ).pipe(
      map((chunk) => {
        let sseMessage: SseMessage | null = null; // Initialize sseMessage as null
        if (chunk && typeof chunk === 'object' && 'answer' in chunk && chunk.answer !== undefined) {
          sseMessage = { type: 'chunk', data: chunk.answer } as SseMessage; // Cast to SseMessage
        } else if (chunk && typeof chunk === 'object' && 'context' in chunk && chunk.context !== undefined) {
          const sources = [...new Set((chunk.context as any[] || []).map((doc: any) => doc.metadata.source || 'N/A'))]; // Explicitly type doc as any
          sseMessage = { type: 'sources', data: sources } as SseMessage; // Cast to SseMessage
        }
        return sseMessage;
      }),
      filter((message): message is SseMessage => message !== null), // Lọc bỏ các chunk null
      finalize(async () => {
        
      }),
      catchError(error => {
        this.logger.error(`Lỗi trong luồng xử lý truy vấn cho session ${conversationId}:`, error); //
        // Trả về một thông báo lỗi SSE để client có thể xử lý
        return of({ type: 'error', data: error.message } as SseMessage); //
      })
    );
  }
}
