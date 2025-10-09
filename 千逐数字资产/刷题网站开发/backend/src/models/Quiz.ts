import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'short-answer' | 'true-false' | 'fill-blank';
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

export interface IQuiz extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  content: string; // 原始内容
  questions: IQuestion[];
  userId: mongoose.Types.ObjectId;
  isPublic: boolean;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  processingProgress?: number;
  processingError?: string;
  
  // 统计信息
  stats: {
    totalQuestions: number;
    questionTypes: {
      multipleChoice: number;
      shortAnswer: number;
      trueFalse: number;
      fillBlank: number;
    };
    averageDifficulty?: 'easy' | 'medium' | 'hard';
    totalPractices: number;
    averageScore?: number;
  };
  
  // 元数据
  metadata: {
    originalFileName?: string;
    fileSize?: number;
    fileType?: string;
    uploadedAt: Date;
    lastPracticedAt?: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>({
  id: {
    type: String,
    required: true
  },
  question: {
    type: String,
    required: [true, '题目内容是必需的'],
    trim: true
  },
  type: {
    type: String,
    enum: ['multiple-choice', 'short-answer', 'true-false', 'fill-blank'],
    required: [true, '题目类型是必需的']
  },
  options: [{
    type: String,
    trim: true
  }],
  answer: {
    type: String,
    required: [true, '答案是必需的'],
    trim: true
  },
  explanation: {
    type: String,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  tags: [{
    type: String,
    trim: true
  }]
}, { _id: false });

const quizSchema = new Schema<IQuiz>({
  title: {
    type: String,
    required: [true, '题库标题是必需的'],
    trim: true,
    maxlength: [200, '标题不能超过200个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, '描述不能超过1000个字符']
  },
  content: {
    type: String,
    required: [true, '题库内容是必需的']
  },
  questions: [questionSchema],
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '用户ID是必需的']
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'processing', 'completed', 'failed'],
    default: 'draft'
  },
  processingProgress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  processingError: {
    type: String
  },
  stats: {
    totalQuestions: {
      type: Number,
      default: 0
    },
    questionTypes: {
      multipleChoice: {
        type: Number,
        default: 0
      },
      shortAnswer: {
        type: Number,
        default: 0
      },
      trueFalse: {
        type: Number,
        default: 0
      },
      fillBlank: {
        type: Number,
        default: 0
      }
    },
    averageDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard']
    },
    totalPractices: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  metadata: {
    originalFileName: String,
    fileSize: Number,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    lastPracticedAt: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      delete ret.__v;
      return ret;
    }
  }
});

// 索引
quizSchema.index({ userId: 1, createdAt: -1 });
quizSchema.index({ title: 'text', description: 'text' });
quizSchema.index({ status: 1 });
quizSchema.index({ isPublic: 1, status: 1 });

// 中间件：更新统计信息
quizSchema.pre('save', function(next) {
  if (this.isModified('questions')) {
    this.stats.totalQuestions = this.questions.length;
    
    // 重置计数器
    this.stats.questionTypes = {
      multipleChoice: 0,
      shortAnswer: 0,
      trueFalse: 0,
      fillBlank: 0
    };
    
    // 统计题目类型
    this.questions.forEach(question => {
      switch (question.type) {
        case 'multiple-choice':
          this.stats.questionTypes.multipleChoice++;
          break;
        case 'short-answer':
          this.stats.questionTypes.shortAnswer++;
          break;
        case 'true-false':
          this.stats.questionTypes.trueFalse++;
          break;
        case 'fill-blank':
          this.stats.questionTypes.fillBlank++;
          break;
      }
    });
    
    // 计算平均难度
    if (this.questions.length > 0) {
      const difficulties = this.questions
        .filter(q => q.difficulty)
        .map(q => q.difficulty);
      
      if (difficulties.length > 0) {
        const difficultyScores = difficulties.map(d => {
          switch (d) {
            case 'easy': return 1;
            case 'medium': return 2;
            case 'hard': return 3;
            default: return 2;
          }
        });
        
        const avgScore = difficultyScores.reduce((a, b) => a + b, 0) / difficultyScores.length;
        
        if (avgScore <= 1.5) {
          this.stats.averageDifficulty = 'easy';
        } else if (avgScore <= 2.5) {
          this.stats.averageDifficulty = 'medium';
        } else {
          this.stats.averageDifficulty = 'hard';
        }
      }
    }
  }
  
  next();
});

export const Quiz = mongoose.model<IQuiz>('Quiz', quizSchema);
