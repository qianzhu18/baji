import mongoose, { Document, Schema } from 'mongoose';

export interface IAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number; // 秒
  attempts: number;
}

export interface IPracticeSession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  quizId: mongoose.Types.ObjectId;
  
  // 练习配置
  mode: 'sequential' | 'random';
  questionOrder: string[]; // 题目ID的顺序
  
  // 练习状态
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  currentQuestionIndex: number;
  
  // 答题记录
  answers: IAnswer[];
  
  // 时间统计
  startedAt: Date;
  completedAt?: Date;
  totalTimeSpent: number; // 秒
  pausedTime: number; // 暂停的总时间
  
  // 成绩统计
  score: {
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    accuracy: number; // 百分比
    averageTimePerQuestion: number; // 秒
  };
  
  // 元数据
  metadata: {
    deviceInfo?: string;
    userAgent?: string;
    ipAddress?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema<IAnswer>({
  questionId: {
    type: String,
    required: [true, '题目ID是必需的']
  },
  userAnswer: {
    type: String,
    required: [true, '用户答案是必需的']
  },
  isCorrect: {
    type: Boolean,
    required: [true, '答案正确性是必需的']
  },
  timeSpent: {
    type: Number,
    required: [true, '答题时间是必需的'],
    min: [0, '答题时间不能为负数']
  },
  attempts: {
    type: Number,
    default: 1,
    min: [1, '尝试次数至少为1']
  }
}, { _id: false });

const practiceSessionSchema = new Schema<IPracticeSession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '用户ID是必需的']
  },
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: [true, '题库ID是必需的']
  },
  mode: {
    type: String,
    enum: ['sequential', 'random'],
    required: [true, '练习模式是必需的']
  },
  questionOrder: [{
    type: String,
    required: true
  }],
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'abandoned'],
    default: 'active'
  },
  currentQuestionIndex: {
    type: Number,
    default: 0,
    min: [0, '当前题目索引不能为负数']
  },
  answers: [answerSchema],
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  totalTimeSpent: {
    type: Number,
    default: 0,
    min: [0, '总用时不能为负数']
  },
  pausedTime: {
    type: Number,
    default: 0,
    min: [0, '暂停时间不能为负数']
  },
  score: {
    totalQuestions: {
      type: Number,
      default: 0,
      min: [0, '总题数不能为负数']
    },
    answeredQuestions: {
      type: Number,
      default: 0,
      min: [0, '已答题数不能为负数']
    },
    correctAnswers: {
      type: Number,
      default: 0,
      min: [0, '正确答案数不能为负数']
    },
    accuracy: {
      type: Number,
      default: 0,
      min: [0, '准确率不能为负数'],
      max: [100, '准确率不能超过100%']
    },
    averageTimePerQuestion: {
      type: Number,
      default: 0,
      min: [0, '平均答题时间不能为负数']
    }
  },
  metadata: {
    deviceInfo: String,
    userAgent: String,
    ipAddress: String
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
practiceSessionSchema.index({ userId: 1, createdAt: -1 });
practiceSessionSchema.index({ quizId: 1, createdAt: -1 });
practiceSessionSchema.index({ userId: 1, quizId: 1 });
practiceSessionSchema.index({ status: 1 });
practiceSessionSchema.index({ completedAt: -1 });

// 中间件：更新成绩统计
practiceSessionSchema.pre('save', function(next) {
  if (this.isModified('answers')) {
    this.score.answeredQuestions = this.answers.length;
    this.score.correctAnswers = this.answers.filter(answer => answer.isCorrect).length;
    
    if (this.score.answeredQuestions > 0) {
      this.score.accuracy = (this.score.correctAnswers / this.score.answeredQuestions) * 100;
      
      const totalTimeForAnswered = this.answers.reduce((sum, answer) => sum + answer.timeSpent, 0);
      this.score.averageTimePerQuestion = totalTimeForAnswered / this.score.answeredQuestions;
    } else {
      this.score.accuracy = 0;
      this.score.averageTimePerQuestion = 0;
    }
  }
  
  next();
});

// 虚拟字段：练习完成度
practiceSessionSchema.virtual('completionRate').get(function() {
  if (this.score.totalQuestions === 0) return 0;
  return (this.score.answeredQuestions / this.score.totalQuestions) * 100;
});

// 虚拟字段：有效练习时间（总时间减去暂停时间）
practiceSessionSchema.virtual('effectiveTimeSpent').get(function() {
  return Math.max(0, this.totalTimeSpent - this.pausedTime);
});

// 实例方法：添加答案
practiceSessionSchema.methods.addAnswer = function(answer: Omit<IAnswer, '_id'>) {
  this.answers.push(answer);
  return this.save();
};

// 实例方法：更新当前题目索引
practiceSessionSchema.methods.updateCurrentQuestion = function(index: number) {
  this.currentQuestionIndex = Math.max(0, Math.min(index, this.score.totalQuestions - 1));
  return this.save();
};

// 实例方法：完成练习
practiceSessionSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// 实例方法：暂停练习
practiceSessionSchema.methods.pause = function() {
  this.status = 'paused';
  return this.save();
};

// 实例方法：恢复练习
practiceSessionSchema.methods.resume = function() {
  this.status = 'active';
  return this.save();
};

export const PracticeSession = mongoose.model<IPracticeSession>('PracticeSession', practiceSessionSchema);
