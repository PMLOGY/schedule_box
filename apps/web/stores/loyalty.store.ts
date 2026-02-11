import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

interface LoyaltyStoreState {
  // UI state
  selectedCardId: string | null;
  programFormOpen: boolean;
  rewardFormOpen: boolean;
  addPointsDialogOpen: boolean;
  editingRewardId: string | null;

  // Actions
  setSelectedCardId: (id: string | null) => void;
  openProgramForm: () => void;
  closeProgramForm: () => void;
  openRewardForm: (rewardId?: string) => void;
  closeRewardForm: () => void;
  openAddPointsDialog: () => void;
  closeAddPointsDialog: () => void;
  setEditingRewardId: (id: string | null) => void;
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  selectedCardId: null,
  programFormOpen: false,
  rewardFormOpen: false,
  addPointsDialogOpen: false,
  editingRewardId: null,
};

// ============================================================================
// STORE
// ============================================================================

export const useLoyaltyStore = create<LoyaltyStoreState>((set) => ({
  ...initialState,

  setSelectedCardId: (id) => {
    set({ selectedCardId: id });
  },

  openProgramForm: () => {
    set({ programFormOpen: true });
  },

  closeProgramForm: () => {
    set({ programFormOpen: false });
  },

  openRewardForm: (rewardId) => {
    set({ rewardFormOpen: true, editingRewardId: rewardId ?? null });
  },

  closeRewardForm: () => {
    set({ rewardFormOpen: false, editingRewardId: null });
  },

  openAddPointsDialog: () => {
    set({ addPointsDialogOpen: true });
  },

  closeAddPointsDialog: () => {
    set({ addPointsDialogOpen: false });
  },

  setEditingRewardId: (id) => {
    set({ editingRewardId: id });
  },

  reset: () => {
    set(initialState);
  },
}));
