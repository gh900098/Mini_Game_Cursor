<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NCard,
  NTabs,
  NTabPane,
  NDescriptions,
  NDescriptionsItem,
  NTag,
  NButton,
  NSpace,
  NDataTable,
  NModal,
  NForm,
  NFormItem,
  NInputNumber,
  NInput,
  NSelect,
  NSpin
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import {
  fetchGetMemberById,
  fetchGetMemberStats,
  fetchGetMemberCreditHistory,
  fetchGetMemberPlayHistory,
  fetchGetMemberScores,
  fetchGetMemberLoginHistory,
  fetchAdjustMemberCredits
} from '@/service/api/management';
import { useLoading } from '@sa/hooks';

const route = useRoute();
const router = useRouter();
const { loading, startLoading, endLoading } = useLoading();

const memberId = computed(() => Number(route.params.id));
const member = ref<Api.Management.Member | null>(null);
const stats = ref<any>(null);
const creditHistory = ref<Api.Management.CreditTransaction[]>([]);
const playHistory = ref<any[]>([]);
const scores = ref<any[]>([]);
const loginHistory = ref<Api.Management.LoginHistory[]>([]);

// Credit adjustment modal
const showAdjustModal = ref(false);
const adjustForm = ref({
  amount: 0,
  type: 'credit' as 'credit' | 'debit',
  reason: ''
});

const adjustTypeOptions = [
  { label: 'Credit (Add Points)', value: 'credit' },
  { label: 'Debit (Deduct Points)', value: 'debit' }
];

// Credit history columns
const creditColumns: DataTableColumns<Api.Management.CreditTransaction> = [
  {
    title: 'Time',
    key: 'createdAt',
    width: 180,
    render(row) {
      return new Date(row.createdAt).toLocaleString();
    }
  },
  {
    title: 'Type',
    key: 'type',
    width: 100,
    render(row) {
      return row.type === 'credit' ? (
        <NTag type="success">Credit</NTag>
      ) : (
        <NTag type="error">Debit</NTag>
      );
    }
  },
  {
    title: 'Amount',
    key: 'amount',
    width: 120,
    render(row) {
      const sign = row.type === 'credit' ? '+' : '-';
      const colorClass = row.type === 'credit' ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
      return (
        <span class={colorClass}>
          {sign}{row.amount}
        </span>
      );
    }
  },
  {
    title: 'Balance After',
    key: 'balanceAfter',
    width: 120,
    render(row) {
      return <span class="font-mono">{row.balanceAfter}</span>;
    }
  },
  {
    title: 'Reason',
    key: 'reason',
    render(row) {
      return row.reason || '-';
    }
  },
  {
    title: 'Source',
    key: 'source',
    width: 150,
    render(row) {
      return <span class="text-xs text-gray-600">{row.source}</span>;
    }
  }
];

// Play history columns
const playColumns: DataTableColumns<any> = [
  {
    title: 'Time',
    key: 'playedAt',
    width: 180,
    render(row) {
      return new Date(row.playedAt).toLocaleString();
    }
  },
  {
    title: 'Game',
    key: 'instance',
    render(row) {
      return (
        <div>
          <div class="font-medium">{row.instance?.name || 'Unknown'}</div>
          <div class="text-xs text-gray-500">{row.instance?.slug}</div>
        </div>
      );
    }
  },
  {
    title: 'Outcome',
    key: 'outcome',
    width: 100,
    render(row) {
      const tagType = row.outcome === 'win' ? 'success' : row.outcome === 'lose' ? 'error' : 'default';
      return (
        <NTag type={tagType}>
          {row.outcome.toUpperCase()}
        </NTag>
      );
    }
  },
  {
    title: 'Result',
    key: 'resultData',
    render(row) {
      if (!row.resultData) return '-';
      return <span class="text-xs font-mono">{JSON.stringify(row.resultData).substring(0, 50)}...</span>;
    }
  }
];

// Scores columns
const scoreColumns: DataTableColumns<any> = [
  {
    title: 'Time',
    key: 'createdAt',
    width: 180,
    render(row) {
      return new Date(row.createdAt).toLocaleString();
    }
  },
  {
    title: 'Game',
    key: 'instance',
    render(row) {
      return (
        <div>
          <div class="font-medium">{row.instance?.name || 'Unknown'}</div>
          <div class="text-xs text-gray-500">{row.instance?.slug}</div>
        </div>
      );
    }
  },
  {
    title: 'Points',
    key: 'points',
    width: 100,
    render(row) {
      return <span class="font-bold text-primary text-lg">{row.points}</span>;
    }
  },
  {
    title: 'Multiplier',
    key: 'multiplier',
    width: 100,
    render(row) {
      if (row.multiplier === 1) return '-';
      return <NTag type="warning">x{row.multiplier}</NTag>;
    }
  },
  {
    title: 'Final',
    key: 'finalPoints',
    width: 100,
    render(row) {
      return <span class="font-bold">{row.points * (row.multiplier || 1)}</span>;
    }
  }
];

// Login history columns
const loginColumns: DataTableColumns<Api.Management.LoginHistory> = [
  {
    title: 'Time',
    key: 'loginAt',
    width: 180,
    render(row) {
      return new Date(row.loginAt).toLocaleString();
    }
  },
  {
    title: 'Status',
    key: 'success',
    width: 100,
    render(row) {
      return row.success ? (
        <NTag type="success">Success</NTag>
      ) : (
        <NTag type="error">Failed</NTag>
      );
    }
  },
  {
    title: 'IP Address',
    key: 'ipAddress',
    width: 150,
    render(row) {
      return <span class="font-mono text-sm">{row.ipAddress || '-'}</span>;
    }
  },
  {
    title: 'User Agent',
    key: 'userAgent',
    render(row) {
      return <span class="text-xs text-gray-600">{row.userAgent?.substring(0, 80) || '-'}...</span>;
    }
  }
];

async function loadMemberData() {
  startLoading();
  try {
    // Load member basic info
    const { data: memberData } = await fetchGetMemberById(memberId.value);
    member.value = memberData;

    // Load stats
    const { data: statsData } = await fetchGetMemberStats(memberId.value);
    stats.value = statsData;

    // Load credit history
    const { data: creditData } = await fetchGetMemberCreditHistory(memberId.value);
    creditHistory.value = creditData;

    // Load play history
    const { data: playData } = await fetchGetMemberPlayHistory(memberId.value);
    playHistory.value = playData;

    // Load scores
    const { data: scoresData } = await fetchGetMemberScores(memberId.value);
    scores.value = scoresData;

    // Load login history
    const { data: loginData } = await fetchGetMemberLoginHistory(memberId.value);
    loginHistory.value = loginData;
  } finally {
    endLoading();
  }
}

function openAdjustModal() {
  adjustForm.value = {
    amount: 0,
    type: 'credit',
    reason: ''
  };
  showAdjustModal.value = true;
}

async function submitAdjustment() {
  if (!adjustForm.value.amount || adjustForm.value.amount <= 0) {
    window.$message?.error('Amount must be greater than 0');
    return;
  }
  if (!adjustForm.value.reason.trim()) {
    window.$message?.error('Reason is required');
    return;
  }

  const { error } = await fetchAdjustMemberCredits(memberId.value, adjustForm.value);
  if (!error) {
    window.$message?.success('Credits adjusted successfully');
    showAdjustModal.value = false;
    loadMemberData(); // Reload data
  }
}

onMounted(() => {
  loadMemberData();
});
</script>

<template>
  <div class="h-full flex-col p-4">
    <NSpace vertical :size="16">
      <!-- Header -->
      <NCard :bordered="false" class="rounded-16px shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <NButton @click="router.back()">← Back</NButton>
            <div v-if="member">
              <div class="text-2xl font-bold">{{ member.username || 'Guest' }}</div>
              <div class="text-sm text-gray-500">Member ID: #{{ member.id }}</div>
            </div>
          </div>
          <NSpace>
            <NButton type="primary" @click="openAdjustModal">
              Adjust Credits
            </NButton>
          </NSpace>
        </div>
      </NCard>

      <!-- Loading State -->
      <NSpin :show="loading">
        <div v-if="member">
          <!-- Basic Info -->
          <NCard title="Member Information" :bordered="false" class="rounded-16px shadow-sm mb-4">
            <NDescriptions :column="3" label-placement="left">
              <NDescriptionsItem label="Username">
                {{ member.username || 'Guest' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="External ID">
                <span class="font-mono">{{ member.externalId || '-' }}</span>
              </NDescriptionsItem>
              <NDescriptionsItem label="Company">
                {{ (member as any).company?.name || '-' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="Type">
                <NTag :type="member.isAnonymous ? 'warning' : 'success'">
                  {{ member.isAnonymous ? 'Guest' : 'Member' }}
                </NTag>
              </NDescriptionsItem>
              <NDescriptionsItem label="Status">
                <NTag :type="member.isActive ? 'success' : 'error'">
                  {{ member.isActive ? 'Active' : 'Disabled' }}
                </NTag>
              </NDescriptionsItem>
              <NDescriptionsItem label="Points Balance">
                <span class="text-2xl font-bold text-primary">{{ member.pointsBalance }}</span>
              </NDescriptionsItem>
              <NDescriptionsItem label="Level">
                <span class="font-bold">Lv.{{ member.level || 1 }}</span>
              </NDescriptionsItem>
              <NDescriptionsItem label="VIP Tier">
                <NTag v-if="member.vipTier" type="warning">VIP {{ member.vipTier }}</NTag>
                <span v-else class="text-gray-400">-</span>
              </NDescriptionsItem>
              <NDescriptionsItem label="Experience">
                {{ member.experience || 0 }} XP
              </NDescriptionsItem>
              <NDescriptionsItem label="Created">
                {{ new Date(member.createdAt).toLocaleString() }}
              </NDescriptionsItem>
              <NDescriptionsItem label="Last Login">
                {{ member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString() : 'Never' }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <!-- Stats -->
          <NCard v-if="stats" title="Statistics" :bordered="false" class="rounded-16px shadow-sm mb-4">
            <NDescriptions :column="4" label-placement="left">
              <NDescriptionsItem label="Total Plays">
                <span class="text-xl font-bold">{{ stats.totalPlays }}</span>
              </NDescriptionsItem>
              <NDescriptionsItem label="Total Points">
                <span class="text-xl font-bold text-primary">{{ stats.totalPoints }}</span>
              </NDescriptionsItem>
              <NDescriptionsItem label="Avg Points/Play">
                <span class="text-xl font-bold text-blue-600">{{ stats.avgPointsPerPlay }}</span>
              </NDescriptionsItem>
              <NDescriptionsItem label="Games Played">
                <span class="text-xl font-bold">{{ stats.gamesPlayed }}</span>
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <!-- Tabs -->
          <NCard :bordered="false" class="rounded-16px shadow-sm">
            <NTabs type="line" animated>
              <NTabPane name="credit" tab="Credit History">
                <NDataTable
                  :columns="creditColumns"
                  :data="creditHistory"
                  :pagination="{ pageSize: 20 }"
                  :max-height="500"
                />
              </NTabPane>

              <NTabPane name="plays" tab="Play History">
                <NDataTable
                  :columns="playColumns"
                  :data="playHistory"
                  :pagination="{ pageSize: 20 }"
                  :max-height="500"
                />
              </NTabPane>

              <NTabPane name="scores" tab="Scores">
                <NDataTable
                  :columns="scoreColumns"
                  :data="scores"
                  :pagination="{ pageSize: 20 }"
                  :max-height="500"
                />
              </NTabPane>

              <NTabPane name="logins" tab="Login History">
                <NDataTable
                  :columns="loginColumns"
                  :data="loginHistory"
                  :pagination="{ pageSize: 20 }"
                  :max-height="500"
                />
              </NTabPane>
            </NTabs>
          </NCard>
        </div>
      </NSpin>
    </NSpace>

    <!-- Adjust Credits Modal -->
    <NModal
      v-model:show="showAdjustModal"
      preset="card"
      title="Adjust Member Credits"
      style="width: 500px"
      :segmented="{ content: true }"
    >
      <NForm>
        <NFormItem label="Type">
          <NSelect
            v-model:value="adjustForm.type"
            :options="adjustTypeOptions"
          />
        </NFormItem>
        <NFormItem label="Amount">
          <NInputNumber
            v-model:value="adjustForm.amount"
            :min="0"
            :step="10"
            class="w-full"
            placeholder="Enter amount"
          />
        </NFormItem>
        <NFormItem label="Reason">
          <NInput
            v-model:value="adjustForm.reason"
            type="textarea"
            :rows="3"
            placeholder="Enter reason for adjustment (required)"
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showAdjustModal = false">Cancel</NButton>
          <NButton type="primary" @click="submitAdjustment">Submit</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>
