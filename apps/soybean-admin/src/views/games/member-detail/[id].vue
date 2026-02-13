<script setup lang="tsx">
import { ref, computed, onMounted, watch, type VNode } from 'vue';
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
  NSpin,
  NTooltip
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import {
  fetchGetMemberById,
  fetchGetMemberStats,
  fetchGetMemberCreditHistory,
  fetchGetMemberPlayHistory,
  fetchGetMemberScores,
  fetchGetMemberLoginHistory,
  fetchGetMemberPrizes,
  fetchAdjustMemberCredits,
  fetchToggleMemberStatus
} from '@/service/api/management';
import { useLoading } from '@sa/hooks';
import { getFriendlyUA } from '@/utils/ua-utils';
import { $t } from '@/locales';

const props = defineProps<{
  showBack?: boolean;
  memberId?: string;
}>();

const route = useRoute();
const router = useRouter();
const { loading, startLoading, endLoading } = useLoading();

const computedMemberId = computed(() => props.memberId || (route.params.id as string));
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
    title: $t('page.manage.prizes.time'),
    key: 'createdAt',
    width: 180,
    render(row: any) {
      return new Date(row.createdAt).toLocaleString();
    }
  },
  {
    title: $t('page.manage.prizes.type'),
    key: 'type',
    width: 100,
    render(row: any) {
      const txType = row.type;
      const color = txType === 'credit' ? '#18a058' : '#d03050';
      const text = txType === 'credit' ? 'Credit' : 'Debit';
      const styleObj = { color, fontWeight: 'bold' };
      return <span style={styleObj}>{text}</span>;
    }
  },
  {
    title: 'Amount',
    key: 'amount',
    width: 120,
    render(row: any) {
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
    render(row: any) {
      return <span class="font-mono">{row.balanceAfter}</span>;
    }
  },
  {
    title: 'Reason',
    key: 'reason',
    render(row: any) {
      return row.reason || '-';
    }
  },
  {
    title: 'Source',
    key: 'source',
    width: 150,
    render(row: any) {
      return <span class="text-xs text-gray-600">{row.source}</span>;
    }
  }
];

// Play history columns
const playColumns: DataTableColumns<any> = [
  {
    title: $t('page.manage.prizes.time'),
    key: 'playedAt',
    width: 180,
    render(row: any) {
      return new Date(row.attemptedAt).toLocaleString();
    }
  },
  {
    title: 'Game',
    key: 'instance',
    render(row: any) {
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
    render(row: any) {
      const tagType = row.outcome === 'win' ? 'success' : row.outcome === 'lose' ? 'error' : 'default';
      return (
        <NTag type={tagType}>
          {row.outcome ? row.outcome.toUpperCase() : 'UNKNOWN'}
        </NTag>
      );
    }
  },
  {
    title: 'Result',
    key: 'resultData',
    minWidth: 160,
    render(row: any) {
      if (!row.resultData) return '-';
      
      const { resultData } = row;
      const tags: VNode[] = [];
      
      if (resultData.isLose) {
        tags.push(<NTag size="small" type="default" round bordered={false} class="opacity-60">Try Again</NTag>);
      } else if (resultData.prize) {
        const isBig = String(resultData.prize).toLowerCase().includes('big') || String(resultData.prize).toLowerCase().includes('jackpot');
        tags.push(
          <NTag size="small" type={isBig ? 'warning' : 'success'} round strong>
            {isBig ? '🏆' : '🎁'} {resultData.prize}
          </NTag>
        );
      } else if (resultData.score !== undefined) {
        tags.push(<NTag size="small" type="info" round bordered={false}>{resultData.score} Points</NTag>);
      }

      const hasTags = tags.length > 0;

      return (
        <NTooltip trigger="hover" placement="left">
          {{
            trigger: () => (
              <NSpace size={[4, 4]} wrap>
                {hasTags ? tags : <span class="text-xs opacity-50 font-mono">Check Details</span>}
              </NSpace>
            ),
            default: () => (
              <pre class="text-[10px] m-0 p-4px leading-tight">
                {JSON.stringify(resultData, null, 2)}
              </pre>
            )
          }}
        </NTooltip>
      );
    }
  }
];

const scoreColumns: DataTableColumns<any> = [
  {
    title: $t('page.manage.prizes.time'),
    key: 'createdAt',
    width: 200,
    fixed: 'left',
    render(row: any) {
      return (
        <span class="text-gray-500 whitespace-nowrap">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      );
    }
  },
  {
    title: 'Game',
    key: 'instance',
    minWidth: 150,
    ellipsis: { tooltip: true },
    render(row: any) {
      return (
        <div class="whitespace-nowrap overflow-hidden">
          <div class="font-medium truncate">{row.instance?.name || 'Unknown'}</div>
          <div class="text-xs text-gray-400 font-mono italic">{row.instance?.slug}</div>
        </div>
      );
    }
  },
  {
    title: 'Raw Score',
    key: 'points',
    width: 90,
    align: 'center',
    render(row: any) {
      return <span class="text-gray-400">{row.score}</span>;
    }
  },
  {
    title: 'Multiplier',
    key: 'multiplier',
    width: 90,
    align: 'center',
    render(row: any) {
      if (!row.multiplier || row.multiplier === 1) return <span class="text-gray-300">-</span>;
      return <NTag type="warning" size="small" round bordered={false}>x{row.multiplier}</NTag>;
    }
  },
  {
    title: 'Awarded Points',
    key: 'finalPoints',
    width: 120,
    align: 'center',
    render(row: any) {
      return <span class="font-bold text-primary text-base">{row.finalPoints ?? (row.score * (row.multiplier || 1))}</span>;
    }
  },
  {
    title: 'Metadata',
    key: 'metadata',
    minWidth: 150,
    render(row: any) {
      if (!row.metadata) return <span class="text-gray-400">-</span>;
      
      const meta = row.metadata;
      const tags: VNode[] = [];
      
      if (meta.isLose === true) {
        tags.push(<NTag size="small" type="default" round bordered={false} class="opacity-60">Try Again</NTag>);
      }
      
      if (meta.prize) {
        const isBig = String(meta.prize).toLowerCase().includes('big') || String(meta.prize).toLowerCase().includes('jackpot');
        tags.push(
          <NTag size="small" type={isBig ? 'warning' : 'success'} round strong>
            {isBig ? '🏆' : '🎁'} {meta.prize}
          </NTag>
        );
      }
      
      if (row.multiplier && row.multiplier > 1) {
        tags.push(<NTag size="small" type="info" round bordered={false}>x{row.multiplier}</NTag>);
      }

      const hasTags = tags.length > 0;
      
      return (
        <NTooltip trigger="hover" placement="left">
          {{
            trigger: () => (
              <NSpace size={[4, 4]} wrap>
                {hasTags ? tags : <span class="text-xs opacity-50 font-mono">View Raw</span>}
              </NSpace>
            ),
            default: () => (
              <pre class="text-[10px] m-0 p-4px leading-tight">
                {JSON.stringify(meta, null, 2)}
              </pre>
            )
          }}
        </NTooltip>
      );
    }
  }
];

// Login history columns
const loginColumns: DataTableColumns<Api.Management.LoginHistory> = [
  {
    title: $t('page.manage.prizes.time'),
    key: 'loginAt',
    width: 180,
    render(row: any) {
      return new Date(row.createdAt).toLocaleString();
    }
  },
  {
    title: 'Status',
    key: 'success',
    width: 100,
    render(row: any) {
      const color = row.success ? '#18a058' : '#d03050';
      const text = row.success ? 'Success' : 'Failed';
      const styleObj = { color, fontWeight: 'bold' };
      return <span style={styleObj}>{text}</span>;
    }
  },
  {
    title: 'IP Address',
    key: 'ipAddress',
    width: 150,
    render(row: any) {
      return <span class="font-mono text-sm">{row.ipAddress || '-'}</span>;
    }
  },
  {
    title: 'User Agent',
    key: 'userAgent',
    render(row: any) {
      if (!row.userAgent) return '-';
      const friendly = getFriendlyUA(row.userAgent);
      return (
        <NTooltip trigger="hover">
          {{
            trigger: () => <span class="text-xs text-primary cursor-help">{friendly}</span>,
            default: () => <div class="max-w-xs break-all">{row.userAgent}</div>
          }}
        </NTooltip>
      );
    }
  }
];

const prizeColumns = [
  {
    title: 'Time',
    key: 'createdAt',
    width: 180,
    render(row: any) {
      return <span class="text-sm">{new Date(row.createdAt).toLocaleString()}</span>;
    }
  },
  {
    title: 'Prize',
    key: 'prizeName',
    minWidth: 150,
    render(row: any) {
      return <span class="font-medium">{row.prizeName}</span>;
    }
  },
  {
    title: 'Type',
    key: 'prizeType',
    width: 130,
    render(row: any) {
      const typeMap: Record<string, { type: 'default' | 'info' | 'success' | 'warning' | 'error', label: string }> = {
        physical: { type: 'warning', label: 'Physical' },
        bonus_credit: { type: 'success', label: 'Bonus Credit' },
        points: { type: 'info', label: 'Points' },
        cash: { type: 'error', label: 'Cash' },
        virtual: { type: 'default', label: 'Virtual' }
      };
      const config = typeMap[row.prizeType] || { type: 'default', label: row.prizeType };
      return <NTag type={config.type}>{config.label}</NTag>;
    }
  },
  {
    title: 'Value',
    key: 'prizeValue',
    minWidth: 150,
    render(row: any) {
      const prizeType = row.prizeType?.toLowerCase();
      const config = row.metadata?.config || {};
      
      // For cash and points, show numeric value
      if (prizeType === 'cash' || prizeType === 'points' || prizeType === 'bonus_credit') {
        if (!row.prizeValue || row.prizeValue === 0) return <span class="text-gray-400">-</span>;
        const valueColor = row.prizeValue > 100 ? 'text-green-600' : 'text-primary';
        return <span class={`font-bold ${valueColor}`}>{row.prizeValue}</span>;
      }
      
      // For items/physical prizes, show description from config
      if (prizeType === 'item' || prizeType === 'physical') {
        const description = config.description || config.itemName || config.name;
        if (description) {
          return <span class="text-sm text-gray-700">{description}</span>;
        }
        // Fallback to prize name only if no description in config
        return <span class="text-sm text-gray-500 italic">{row.prizeName}</span>;
      }
      
      // For virtual/e-gift, show code or description from config
      if (prizeType === 'virtual' || prizeType === 'e-gift' || prizeType === 'egift') {
        const code = config.code || config.voucherCode || row.metadata?.code;
        const description = config.description || config.name;
        if (code) {
          return (
            <div>
              <div class="font-mono text-xs text-primary">{code}</div>
              {description && <div class="text-xs text-gray-500">{description}</div>}
            </div>
          );
        }
        if (description) {
          return <span class="text-sm text-gray-700">{description}</span>;
        }
        return <span class="text-gray-400">-</span>;
      }
      
      // Fallback: show config description or dash
      const fallbackDesc = config.description || config.details || config.name;
      if (fallbackDesc) {
        return <span class="text-sm text-gray-700">{fallbackDesc}</span>;
      }
      
      return <span class="text-gray-400">-</span>;
    }
  },
  {
    title: 'Status',
    key: 'status',
    width: 110,
    render(row: any) {
      const statusMap: Record<string, { type: 'default' | 'info' | 'success' | 'warning' | 'error', label: string }> = {
        pending: { type: 'warning', label: 'Pending' },
        claimed: { type: 'info', label: 'Claimed' },
        fulfilled: { type: 'success', label: 'Fulfilled' },
        shipped: { type: 'success', label: 'Shipped' },
        rejected: { type: 'error', label: 'Rejected' }
      };
      const config = statusMap[row.status] || { type: 'default', label: row.status };
      return <NTag type={config.type}>{config.label}</NTag>;
    }
  },
  {
    title: 'Game Instance',
    key: 'instance',
    minWidth: 180,
    render(row: any) {
      return (
        <div>
          <div class="font-medium text-sm">{row.instance?.name || 'Unknown'}</div>
          <div class="text-xs text-gray-500">{row.instance?.company?.name || '-'}</div>
        </div>
      );
    }
  },
  {
    title: 'Updated',
    key: 'updatedAt',
    width: 180,
    render(row: any) {
      return <span class="text-sm text-gray-600">{new Date(row.updatedAt).toLocaleString()}</span>;
    }
  }
];

const prizes = ref<any[]>([]);

async function loadMemberData() {
  if (!computedMemberId.value) return;
  
  startLoading();
  try {
    console.log('Loading member data for ID:', computedMemberId.value);
    // Load member basic info
    const { data: memberData, error: memberError } = await fetchGetMemberById(computedMemberId.value);
    if (memberError) {
        console.error('Failed to fetch member:', memberError);
        window.$message?.error('Failed to load member details');
        return;
    }
    member.value = memberData;
    console.log('Member loaded:', memberData);

    // Load stats
    const { data: statsData } = await fetchGetMemberStats(computedMemberId.value);
    stats.value = statsData;

    // Load credit history
    const { data: creditData } = await fetchGetMemberCreditHistory(computedMemberId.value);
    creditHistory.value = creditData || [];


    // Load play history
    const { data: playData } = await fetchGetMemberPlayHistory(computedMemberId.value);
    playHistory.value = playData || [];

    // Load scores
    const { data: scoresData } = await fetchGetMemberScores(computedMemberId.value);
    scores.value = scoresData || [];

    // Load login history
    const { data: loginData } = await fetchGetMemberLoginHistory(computedMemberId.value);
    loginHistory.value = loginData || [];

    // Load prizes
    const { data: prizesData } = await fetchGetMemberPrizes(computedMemberId.value);
    prizes.value = prizesData || [];
  } catch (err) {
      console.error('Error in loadMemberData:', err);
      window.$message?.error('An unexpected error occurred');
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

  const { error } = await fetchAdjustMemberCredits(computedMemberId.value, adjustForm.value);
  if (!error) {
    window.$message?.success('Credits adjusted successfully');
    showAdjustModal.value = false;
    loadMemberData(); // Reload data
  }
}

watch(computedMemberId, (newId) => {
  if (newId) {
    loadMemberData();
  }
});

onMounted(() => {
  if (computedMemberId.value) {
    loadMemberData();
  }
});
</script>

<template>
  <div class="p-4">
    <NSpace vertical :size="16">
      <!-- Header -->
      <!-- Header -->
      <div v-if="!computedMemberId" class="mb-4">
        <NAlert type="error" title="Invalid Request">
          No Member ID provided.
        </NAlert>
      </div>
      <NCard :bordered="false" class="rounded-16px shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <NButton v-if="!props.memberId || props.showBack" @click="router.back()">← Back</NButton>
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
              <NDescriptionsItem label="Real Name">
                {{ member.realName || '-' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="External ID">
                <span class="font-mono">{{ member.externalId || '-' }}</span>
              </NDescriptionsItem>
              <NDescriptionsItem label="Company">
                {{ (member as any).company?.name || '-' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="Phone">
                {{ member.phoneNumber || '-' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="Email">
                {{ member.email || '-' }}
              </NDescriptionsItem>
               <NDescriptionsItem label="Address">
                {{ member.address || '-' }}
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
              <NTabPane name="credit" :tab="$t('page.manage.memberDetail.tabs.credits')">
                <NDataTable
                  :columns="creditColumns"
                  :data="creditHistory"
                  :pagination="{ pageSize: 20 }"
                  :max-height="500"
                />
              </NTabPane>

              <NTabPane name="plays" :tab="$t('page.manage.memberDetail.tabs.plays')">
                <NDataTable
                  :columns="playColumns"
                  :data="playHistory"
                  :pagination="{ pageSize: 20 }"
                  :max-height="500"
                />
              </NTabPane>

              <NTabPane name="scores" :tab="$t('page.manage.memberDetail.tabs.scores')">
                <NDataTable
                  :columns="scoreColumns"
                  :data="scores"
                  :pagination="{ pageSize: 20 }"
                  :max-height="500"
                />
              </NTabPane>

              <NTabPane name="prizes" :tab="$t('page.manage.memberDetail.tabs.prizes')">
                <NDataTable
                  :columns="prizeColumns"
                  :data="prizes"
                  :loading="loading"
                  :pagination="{ pageSize: 10 }"
                  :scroll-x="1200"
                />
              </NTabPane>

              <NTabPane name="logins" :tab="$t('page.manage.memberDetail.tabs.logins')">
                <NDataTable
                  :columns="loginColumns"
                  :data="loginHistory"
                  :loading="loading"
                  :pagination="{ pageSize: 10 }"
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
