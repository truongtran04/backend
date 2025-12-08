// src/chat/chat.service.ts
import { BadRequestException, Injectable, Logger, OnModuleInit, ServiceUnavailableException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, from, map, filter, finalize, switchMap, of, catchError } from 'rxjs';

// LangChain imports
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChatPromptTemplate, MessagesPlaceholder, PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence, RunnableWithMessageHistory } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { formatDocumentsAsString } from 'langchain/util/document';
import { createHistoryAwareRetriever } from 'langchain/chains/history_aware_retriever';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression';
import { LLMChainExtractor } from 'langchain/retrievers/document_compressors/chain_extract';
import { MultiQueryRetriever } from 'langchain/retrievers/multi_query';// import { RedisChatMessageHistory } from '@langchain/community/stores/message/redis';
import { ChatMessageHistory } from "@langchain/community/stores/message/in_memory";
import { createClient, RedisClientType } from 'redis';
import * as crypto from 'crypto';

// Định nghĩa kiểu cho sự kiện SSE
export type SseMessage = { type: 'chunk' | 'sources' | 'error'; data: any };

const VECTOR_STORE_PATH = 'vectorstore/db_faiss';
const DATA_PATH = 'data';
const CACHE_TTL_SECONDS = 3600; // Thời gian sống của cache là 1 giờ (3600 giây)

@Injectable()
export class MediBotService implements OnModuleInit {
  private readonly logger = new Logger(MediBotService.name);
  private vectorStore: FaissStore;
  private llm: ChatOpenAI;
  private smallLlm: ChatOpenAI;
  private conversationalChain: RunnableWithMessageHistory<any, any>;
  // private redisClient: RedisClientType; // Tạm thời vô hiệu hóa Redis
  private messageHistories: Map<string, ChatMessageHistory>; // Sử dụng Map để lưu trữ lịch sử trong bộ nhớ

  // Thuộc tính giám sát hiệu suất
  private totalQueries = 0;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(private readonly configService: ConfigService) {}
  // Hàm này sẽ được gọi khi module được khởi tạo
  async onModuleInit() {
    try {
      this.logger.log('Đang khởi tạo MediBot Service...');
      // --- Tạm thời vô hiệu hóa kết nối Redis ---
      // this.logger.log('Đang kết nối tới Redis...');
      // this.redisClient = createClient({ url: this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379' });
      // await this.redisClient.connect();
      // this.redisClient.on('error', (err) => this.logger.error('Lỗi Redis Client:', err));
      // this.logger.log('Kết nối Redis thành công.');
      // --- Kết thúc phần vô hiệu hóa Redis ---
      this.messageHistories = new Map(); // Khởi tạo Map cho lịch sử hội thoại
      await this.initializeChain();
      this.logger.log('MediBot Service đã được khởi tạo thành công.');
    } catch (error) {
      this.logger.error('Lỗi nghiêm trọng khi khởi tạo service:', error);
      // throw new InternalServerErrorException('Không thể khởi tạo MediBot Service. Vui lòng kiểm tra logs để biết chi tiết.', error.message);
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

    // Cải tiến 1: Sử dụng MultiQueryRetriever để tạo nhiều truy vấn từ câu hỏi gốc
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
  
  /**
   * Trả về các chỉ số hiệu suất hiện tại của service.
   */
  public getMetrics() {
    return {
      totalQueries: this.totalQueries,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRate: this.totalQueries > 0 ? (this.cacheHits / this.totalQueries) * 100 : 0,
    };
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
        'user',
        'Dựa vào cuộc trò chuyện trên, hãy tạo ra một câu hỏi tìm kiếm để có thể tìm thông tin liên quan đến câu hỏi cuối cùng.',
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
    const systemTemplate = `Sử dụng những thông tin dưới đây để trả lời câu hỏi của người dùng.
      Nếu bạn không biết câu trả lời từ thông tin được cung cấp, hãy nói rằng bạn không biết, đừng cố bịa ra câu trả lời.
      Hãy trả lời bằng tiếng Việt một cách thân thiện và dễ hiểu.

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
    });
    const docs = await loader.load();
    this.logger.log(`Đã tải ${docs.length} tài liệu.`);
    // const loader = new DirectoryLoader(DATA_PATH, {
    //   '.pdf': (path) => new PDFLoader(path),
    // });
    // const docs = await loader.load();
    // this.logger.log(`Đã tải ${docs.length} tài liệu.`);

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });
    const splitDocs = await textSplitter.splitDocuments(docs);
    this.logger.log(`Tài liệu đã được chia thành ${splitDocs.length} đoạn.`);
    // const textSplitter = new RecursiveCharacterTextSplitter({
    //   chunkSize: 1000,
    //   chunkOverlap: 100,
    // });
    // const splitDocs = await textSplitter.splitDocuments(docs);
    // this.logger.log(`Tài liệu đã được chia thành ${splitDocs.length} đoạn.`);

    this.logger.log('Đang tạo vector embeddings và chỉ mục FAISS...');
    const vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);
    await vectorStore.save(VECTOR_STORE_PATH);
    this.logger.log(`Đã tạo và lưu trữ vector store mới tại: ${VECTOR_STORE_PATH}`);
    // const vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);
    // await vectorStore.save(VECTOR_STORE_PATH);
    // this.logger.log(`Đã tạo và lưu trữ vector store mới tại: ${VECTOR_STORE_PATH}`);

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

  async askQuestionStream(query: string, conversationId: string): Promise<Observable<SseMessage>> {
    const startTime = Date.now();
    this.totalQueries++;

    const sanitizedQuery = this.validateAndSanitizeInput(query);

    this.logger.log(`Nhận câu hỏi đã làm sạch cho session ${conversationId}: "${sanitizedQuery}"`);


    if (!this.conversationalChain) {
      this.logger.error('Chuỗi hội thoại chưa được khởi tạo.');
      throw new ServiceUnavailableException('Hệ thống chưa sẵn sàng, vui lòng thử lại sau.'); //
    }

    // --- Tạm thời vô hiệu hóa Caching ---
    // // Tạo cache key bằng cách kết hợp conversationId và hash của câu hỏi đã làm sạch
    // const cacheKey = `query_cache:${conversationId}:${crypto.createHash('sha256').update(sanitizedQuery).digest('hex')}`; //

    // try {
    //   // 1. Kiểm tra cache
    //   const cachedResult = await this.redisClient.get(cacheKey); //
    //   if (cachedResult) {
    //     this.cacheHits++;
    //     this.logger.log(`Cache hit cho session ${conversationId}, query: "${sanitizedQuery}"`); //
    //     const messages: SseMessage[] = JSON.parse(cachedResult); //
    //     return from(messages); // Trả về kết quả từ cache dưới dạng Observable
    //   }
    // } catch (cacheError) {
    //   this.logger.error(`Lỗi khi đọc cache hoặc parse JSON cho session ${conversationId}:`, cacheError); //
    //   // Nếu có lỗi với cache, chúng ta sẽ bỏ qua cache và tiếp tục xử lý truy vấn
    // }
    // this.cacheMisses++;
    // --- Kết thúc phần vô hiệu hóa Caching ---

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
        const duration = Date.now() - startTime;
        this.logger.log(`Truy vấn cho session ${conversationId} hoàn tất trong ${duration}ms.`);
        // --- Tạm thời vô hiệu hóa Caching ---
        // // Khi stream hoàn tất, lưu toàn bộ kết quả vào cache
        // if (accumulatedChunks.length > 0) {
        //   try {
        //     await this.redisClient.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(accumulatedChunks)); //
        //     this.logger.log(`Đã lưu kết quả vào cache cho session ${conversationId}, query: "${sanitizedQuery}"`); //
        //   } catch (cacheError) {
        //     this.logger.error(`Lỗi khi lưu vào cache cho session ${conversationId}:`, cacheError); //
        //   }
        // }
        // --- Kết thúc phần vô hiệu hóa Caching ---
      }),
      catchError(error => {
        this.logger.error(`Lỗi trong luồng xử lý truy vấn cho session ${conversationId}:`, error); //
        // Trả về một thông báo lỗi SSE để client có thể xử lý
        return of({ type: 'error', data: error.message } as SseMessage); //
      })
    );
  }
}
