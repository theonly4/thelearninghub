import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { WorkforceGroup, QuizStatus } from "@/types/hipaa";
import { supabase } from "@/integrations/supabase/client";

interface QuizResult {
  quizId: string;
  score: number;
  passed: boolean;
  completedAt: string;
}

interface QuizInfo {
  id: string;
  title: string;
  sequence_number: number;
}

interface ProgressState {
  completedMaterials: string[];
  quizResults: QuizResult[];
  currentWorkforceGroup: WorkforceGroup | null;
  isLoading: boolean;
  userId: string | null;
  // Database-loaded data
  requiredMaterialIds: string[];
  quizzes: QuizInfo[];
}

interface ProgressContextType {
  // State
  completedMaterials: string[];
  quizResults: QuizResult[];
  currentWorkforceGroup: WorkforceGroup | null;
  isLoading: boolean;
  
  // Actions
  setWorkforceGroup: (group: WorkforceGroup) => void;
  markMaterialComplete: (materialId: string) => Promise<void>;
  recordQuizResult: (quizId: string, score: number, passed: boolean) => void;
  loadProgressFromDatabase: (userId: string, workforceGroup: WorkforceGroup | null) => Promise<void>;
  
  // Computed
  areAllMaterialsComplete: () => boolean;
  getMaterialProgress: () => { completed: number; total: number; percentage: number };
  getQuizStatus: (quizId: string) => QuizStatus;
  canTakeQuiz: (quizId: string) => boolean;
  getNextAction: () => { type: 'material' | 'quiz' | 'complete'; id?: string; message: string };
  isMaterialComplete: (materialId: string) => boolean;
  getQuizResult: (quizId: string) => QuizResult | undefined;
  resetProgress: (newWorkforceGroup?: WorkforceGroup) => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>({
    completedMaterials: [],
    quizResults: [],
    currentWorkforceGroup: null,
    isLoading: true,
    userId: null,
    requiredMaterialIds: [],
    quizzes: [],
  });

  // Load progress from database when user is authenticated
  const loadProgressFromDatabase = useCallback(async (userId: string, workforceGroup: WorkforceGroup | null) => {
    if (!userId) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, userId }));

    try {
      // Fetch completed materials from database
      const { data: progressData, error: progressError } = await supabase
        .from('user_training_progress')
        .select('material_id')
        .eq('user_id', userId);

      if (progressError) {
        console.error("Error fetching training progress:", progressError);
      }

      // Fetch quiz results from database
      const { data: quizData, error: quizError } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, score, passed, completed_at')
        .eq('user_id', userId)
        .not('completed_at', 'is', null);

      if (quizError) {
        console.error("Error fetching quiz attempts:", quizError);
      }

      // Fetch required training materials for this workforce group from database
      let requiredMaterialIds: string[] = [];
      if (workforceGroup) {
        const { data: materialsData, error: materialsError } = await supabase
          .from('training_materials')
          .select('id, workforce_groups')
          .order('sequence_number', { ascending: true });

        if (materialsError) {
          console.error("Error fetching materials:", materialsError);
        } else if (materialsData) {
          requiredMaterialIds = materialsData
            .filter(m => (m.workforce_groups as WorkforceGroup[])?.includes(workforceGroup))
            .map(m => m.id);
        }
      }

      // Fetch quizzes for this workforce group from database
      let quizzes: QuizInfo[] = [];
      if (workforceGroup) {
        const { data: quizzesData, error: quizzesError } = await supabase
          .from('quizzes')
          .select('id, title, sequence_number, workforce_groups')
          .order('sequence_number', { ascending: true });

        if (quizzesError) {
          console.error("Error fetching quizzes:", quizzesError);
        } else if (quizzesData) {
          quizzes = quizzesData
            .filter(q => (q.workforce_groups as WorkforceGroup[])?.includes(workforceGroup))
            .map(q => ({ id: q.id, title: q.title, sequence_number: q.sequence_number }));
        }
      }

      const completedMaterials = progressData?.map(p => p.material_id) || [];
      const quizResults: QuizResult[] = quizData?.map(q => ({
        quizId: q.quiz_id,
        score: q.score,
        passed: q.passed,
        completedAt: q.completed_at || new Date().toISOString(),
      })) || [];

      setState({
        completedMaterials,
        quizResults,
        currentWorkforceGroup: workforceGroup,
        isLoading: false,
        userId,
        requiredMaterialIds,
        quizzes,
      });
    } catch (error) {
      console.error("Error loading progress from database:", error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const setWorkforceGroup = (group: WorkforceGroup) => {
    setState(prev => ({ ...prev, currentWorkforceGroup: group }));
  };

  // Mark material complete - now uses database via Edge Function
  const markMaterialComplete = async (materialId: string) => {
    if (!state.userId) {
      console.warn("Cannot mark material complete: no user ID");
      return;
    }

    // Optimistically update local state
    setState(prev => {
      if (prev.completedMaterials.includes(materialId)) {
        return prev;
      }
      return {
        ...prev,
        completedMaterials: [...prev.completedMaterials, materialId],
      };
    });

    // The actual database insert is handled by the complete-training-material Edge Function
    // which is called from TrainingMaterialReader component
  };

  const recordQuizResult = (quizId: string, score: number, passed: boolean) => {
    setState(prev => {
      const existingIndex = prev.quizResults.findIndex(r => r.quizId === quizId);
      const newResult: QuizResult = {
        quizId,
        score,
        passed,
        completedAt: new Date().toISOString(),
      };
      
      if (existingIndex >= 0) {
        // Update existing - keep best score
        const updated = [...prev.quizResults];
        if (score > updated[existingIndex].score || (!updated[existingIndex].passed && passed)) {
          updated[existingIndex] = newResult;
        }
        return { ...prev, quizResults: updated };
      }
      
      return { ...prev, quizResults: [...prev.quizResults, newResult] };
    });
  };

  const areAllMaterialsComplete = (): boolean => {
    if (!state.currentWorkforceGroup || state.requiredMaterialIds.length === 0) return false;
    return state.requiredMaterialIds.every(id => state.completedMaterials.includes(id));
  };

  const getMaterialProgress = () => {
    if (!state.currentWorkforceGroup || state.requiredMaterialIds.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    const completed = state.requiredMaterialIds.filter(id => state.completedMaterials.includes(id)).length;
    const total = state.requiredMaterialIds.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const getQuizStatus = (quizId: string): QuizStatus => {
    if (!state.currentWorkforceGroup) return "locked";
    
    const quiz = state.quizzes.find(q => q.id === quizId);
    if (!quiz) return "locked";

    const result = state.quizResults.find(r => r.quizId === quizId);
    
    // Check if already passed
    if (result?.passed) return "passed";
    if (result && !result.passed) return "failed";

    // Check prerequisites
    if (!areAllMaterialsComplete()) return "locked";

    // For quiz 1, just need materials complete
    if (quiz.sequence_number === 1) return "unlocked";

    // For quiz 2+, need previous quiz passed
    const previousQuiz = state.quizzes.find(q => q.sequence_number === quiz.sequence_number - 1);
    if (previousQuiz) {
      const prevResult = state.quizResults.find(r => r.quizId === previousQuiz.id);
      if (!prevResult?.passed) return "locked";
    }

    return "unlocked";
  };

  const canTakeQuiz = (quizId: string): boolean => {
    const status = getQuizStatus(quizId);
    return status === "unlocked" || status === "failed";
  };

  const getNextAction = (): { type: 'material' | 'quiz' | 'complete'; id?: string; message: string } => {
    if (!state.currentWorkforceGroup) {
      return { type: 'material', message: 'Contact your administrator to assign your workforce group.' };
    }

    // Check if all materials are complete
    const incompleteMaterial = state.requiredMaterialIds.find(id => !state.completedMaterials.includes(id));
    if (incompleteMaterial) {
      return { 
        type: 'material', 
        id: incompleteMaterial, 
        message: 'Complete training materials to unlock quizzes.' 
      };
    }

    // Check quizzes in order
    for (const quiz of state.quizzes) {
      const result = state.quizResults.find(r => r.quizId === quiz.id);
      if (!result?.passed) {
        return { 
          type: 'quiz', 
          id: quiz.id, 
          message: `Take ${quiz.title} (${quiz.sequence_number} of ${state.quizzes.length})` 
        };
      }
    }

    return { type: 'complete', message: 'All training and quizzes completed!' };
  };

  const isMaterialComplete = (materialId: string): boolean => {
    return state.completedMaterials.includes(materialId);
  };

  const getQuizResult = (quizId: string): QuizResult | undefined => {
    return state.quizResults.find(r => r.quizId === quizId);
  };

  const resetProgress = (newWorkforceGroup?: WorkforceGroup) => {
    setState(prev => ({
      ...prev,
      completedMaterials: [],
      quizResults: [],
      currentWorkforceGroup: newWorkforceGroup ?? prev.currentWorkforceGroup,
    }));
  };

  return (
    <ProgressContext.Provider
      value={{
        completedMaterials: state.completedMaterials,
        quizResults: state.quizResults,
        currentWorkforceGroup: state.currentWorkforceGroup,
        isLoading: state.isLoading,
        setWorkforceGroup,
        markMaterialComplete,
        recordQuizResult,
        loadProgressFromDatabase,
        areAllMaterialsComplete,
        getMaterialProgress,
        getQuizStatus,
        canTakeQuiz,
        getNextAction,
        isMaterialComplete,
        getQuizResult,
        resetProgress,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgress must be used within a ProgressProvider");
  }
  return context;
}
