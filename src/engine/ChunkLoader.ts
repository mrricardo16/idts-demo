import { PriorityModelLoader } from "./PriorityModelLoader";
import type { AreaChunkConfig, ChunkLoaderState, ModelLODLevel } from "../types/twin";

export class ChunkLoader {
  private stableChunk?: AreaChunkConfig;
  private loadingChunk?: AreaChunkConfig;
  private readonly priorityLoader = new PriorityModelLoader();
  private state: ChunkLoaderState = {
    isLoading: false,
    loadedChunkIds: [],
    message: "等待区域 chunk 加载",
    queue: [],
  };

  constructor(private readonly chunks: AreaChunkConfig[]) {}

  beginLoad(chunkId: string, level: ModelLODLevel): AreaChunkConfig {
    const chunk = this.findChunk(chunkId);
    this.loadingChunk = chunk;
    this.priorityLoader.clear();
    this.priorityLoader.enqueueMany([
      {
        jobId: `${chunk.chunkId}:visible:${level}`,
        modelId: chunk.modelRefs[0] ?? "unknown",
        level,
        priority: "visible-area",
        chunkId: chunk.chunkId,
      },
      ...chunk.neighborChunkIds.map((neighborChunkId) => ({
        jobId: `${neighborChunkId}:prefetch:${level}`,
        modelId: this.findChunk(neighborChunkId).modelRefs[0] ?? "unknown",
        level,
        priority: "neighbor-prefetch" as const,
        chunkId: neighborChunkId,
      })),
    ]);

    this.state = {
      isLoading: true,
      currentChunkId: chunk.chunkId,
      stableChunkId: this.stableChunk?.chunkId,
      loadedChunkIds: this.stableChunk ? [this.stableChunk.chunkId] : [],
      message: `正在加载区域 chunk：${chunk.chunkName}`,
      queue: this.priorityLoader.snapshot(),
    };
    return chunk;
  }

  commitLoaded(chunkId: string): ChunkLoaderState {
    const chunk = this.findChunk(chunkId);
    this.stableChunk = chunk;
    this.loadingChunk = undefined;
    this.state = {
      isLoading: false,
      currentChunkId: chunk.chunkId,
      stableChunkId: chunk.chunkId,
      loadedChunkIds: [chunk.chunkId],
      message: `已加载区域 chunk：${chunk.chunkName}`,
      queue: this.priorityLoader.snapshot(),
    };
    return this.state;
  }

  failLoad(chunkId: string, reason: string): ChunkLoaderState {
    this.loadingChunk = undefined;
    this.state = {
      isLoading: false,
      currentChunkId: this.stableChunk?.chunkId,
      stableChunkId: this.stableChunk?.chunkId,
      loadedChunkIds: this.stableChunk ? [this.stableChunk.chunkId] : [],
      failedChunkId: chunkId,
      message: `区域 chunk 加载失败，已回滚到上一个稳定区域：${reason}`,
      queue: this.priorityLoader.snapshot(),
    };
    return this.state;
  }

  getState(): ChunkLoaderState {
    return this.state;
  }

  getStableChunk(): AreaChunkConfig | undefined {
    return this.stableChunk;
  }

  getLoadingChunk(): AreaChunkConfig | undefined {
    return this.loadingChunk;
  }

  private findChunk(chunkId: string): AreaChunkConfig {
    const chunk = this.chunks.find((item) => item.chunkId === chunkId);
    if (!chunk) {
      throw new Error(`Area chunk not found: ${chunkId}`);
    }

    return chunk;
  }
}
