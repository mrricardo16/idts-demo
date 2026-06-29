<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { TwinScene } from "../engine/TwinScene";
import { statusClassNames, statusLabels } from "../mock/deviceStatus";
import type { DeviceStatus, ModelLoadState, TwinDevice } from "../types/twin";

const viewportRef = ref<HTMLElement | null>(null);
const twinScene = ref<TwinScene | null>(null);
const devices = ref<TwinDevice[]>([]);
const selectedDevice = ref<TwinDevice | undefined>();
const axesVisible = ref(false);
const loadState = ref<ModelLoadState>({
  isLoading: true,
  useFallback: false,
  message: "等待初始化",
});

const statusOrder: DeviceStatus[] = ["normal", "running", "warning", "error", "stopped"];

const activeDevice = computed(() => selectedDevice.value ?? devices.value[0]);

function selectDevice(device: TwinDevice): void {
  selectedDevice.value = device;
  twinScene.value?.selectDevice(device.meshName);
}

function toggleAxes(): void {
  axesVisible.value = !axesVisible.value;
  twinScene.value?.setAxesVisible(axesVisible.value);
}

onMounted(async () => {
  if (!viewportRef.value) {
    return;
  }

  const scene = new TwinScene(viewportRef.value, {
    onLoadStateChange: (state) => {
      loadState.value = state;
    },
    onDevicesChange: (nextDevices) => {
      devices.value = nextDevices;
      if (selectedDevice.value) {
        selectedDevice.value = nextDevices.find(
          (device) => device.id === selectedDevice.value?.id,
        );
      }
    },
    onSelectDevice: (device) => {
      selectedDevice.value = device;
    },
  });

  twinScene.value = scene;
  await scene.init();
});

onBeforeUnmount(() => {
  twinScene.value?.dispose();
});
</script>

<template>
  <main class="twin-shell">
    <header class="twin-header">
      <div>
        <p class="twin-kicker">TwinDemo</p>
        <h1>数字孪生 WebGL 技术 Demo</h1>
        <p>Vue3 + TypeScript + Three.js</p>
      </div>
      <button class="tool-button" type="button" @click="toggleAxes">
        {{ axesVisible ? "隐藏坐标轴" : "显示坐标轴" }}
      </button>
    </header>

    <section class="twin-workbench">
      <div class="viewport-wrap" aria-label="三维数字孪生视图">
        <div ref="viewportRef" class="twin-viewport"></div>
        <div class="viewport-badge" :class="{ warning: loadState.useFallback }">
          {{ loadState.isLoading ? "模型加载中" : loadState.useFallback ? "Fallback 场景" : "真实 GLB" }}
        </div>
      </div>

      <aside class="side-panel" aria-label="设备状态信息">
        <section class="panel-section">
          <div class="section-heading">
            <span>当前设备</span>
            <span v-if="activeDevice" class="mesh-code">{{ activeDevice.meshName }}</span>
          </div>

          <div v-if="activeDevice" class="device-detail">
            <div>
              <span>设备编号</span>
              <strong>{{ activeDevice.id }}</strong>
            </div>
            <div>
              <span>设备名称</span>
              <strong>{{ activeDevice.name }}</strong>
            </div>
            <div>
              <span>设备类型</span>
              <strong>{{ activeDevice.type }}</strong>
            </div>
            <div>
              <span>当前状态</span>
              <strong :class="['status-text', statusClassNames[activeDevice.status]]">
                {{ statusLabels[activeDevice.status] }}
              </strong>
            </div>
            <div>
              <span>更新时间</span>
              <strong>{{ activeDevice.updateTime }}</strong>
            </div>
          </div>
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <span>模型加载</span>
          </div>
          <p class="load-message">{{ loadState.message }}</p>
          <dl class="load-meta">
            <div>
              <dt>真实模型</dt>
              <dd>{{ loadState.useFallback ? "未使用" : "优先加载" }}</dd>
            </div>
            <div>
              <dt>Fallback</dt>
              <dd>{{ loadState.useFallback ? "已启用" : "未启用" }}</dd>
            </div>
          </dl>
        </section>

        <section class="panel-section">
          <div class="section-heading">
            <span>状态图例</span>
          </div>
          <ul class="legend-list">
            <li v-for="status in statusOrder" :key="status">
              <span :class="['legend-dot', statusClassNames[status]]"></span>
              <span>{{ statusLabels[status] }}</span>
              <code>{{ status }}</code>
            </li>
          </ul>
        </section>

        <section class="panel-section device-list-section">
          <div class="section-heading">
            <span>Mock 设备列表</span>
          </div>
          <div class="device-list">
            <button
              v-for="device in devices"
              :key="device.id"
              class="device-row"
              :class="{ active: activeDevice?.id === device.id }"
              type="button"
              @click="selectDevice(device)"
            >
              <span :class="['legend-dot', statusClassNames[device.status]]"></span>
              <span class="device-row-main">
                <strong>{{ device.name }}</strong>
                <small>{{ device.id }}</small>
              </span>
              <span class="device-row-status">{{ statusLabels[device.status] }}</span>
            </button>
          </div>
        </section>
      </aside>
    </section>
  </main>
</template>
