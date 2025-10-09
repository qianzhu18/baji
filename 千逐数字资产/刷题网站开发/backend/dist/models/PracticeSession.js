"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PracticeSession = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const answerSchema = new mongoose_1.Schema({
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
const practiceSessionSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, '用户ID是必需的']
    },
    quizId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        transform: function (doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});
practiceSessionSchema.index({ userId: 1, createdAt: -1 });
practiceSessionSchema.index({ quizId: 1, createdAt: -1 });
practiceSessionSchema.index({ userId: 1, quizId: 1 });
practiceSessionSchema.index({ status: 1 });
practiceSessionSchema.index({ completedAt: -1 });
practiceSessionSchema.pre('save', function (next) {
    if (this.isModified('answers')) {
        this.score.answeredQuestions = this.answers.length;
        this.score.correctAnswers = this.answers.filter(answer => answer.isCorrect).length;
        if (this.score.answeredQuestions > 0) {
            this.score.accuracy = (this.score.correctAnswers / this.score.answeredQuestions) * 100;
            const totalTimeForAnswered = this.answers.reduce((sum, answer) => sum + answer.timeSpent, 0);
            this.score.averageTimePerQuestion = totalTimeForAnswered / this.score.answeredQuestions;
        }
        else {
            this.score.accuracy = 0;
            this.score.averageTimePerQuestion = 0;
        }
    }
    next();
});
practiceSessionSchema.virtual('completionRate').get(function () {
    if (this.score.totalQuestions === 0)
        return 0;
    return (this.score.answeredQuestions / this.score.totalQuestions) * 100;
});
practiceSessionSchema.virtual('effectiveTimeSpent').get(function () {
    return Math.max(0, this.totalTimeSpent - this.pausedTime);
});
practiceSessionSchema.methods.addAnswer = function (answer) {
    this.answers.push(answer);
    return this.save();
};
practiceSessionSchema.methods.updateCurrentQuestion = function (index) {
    this.currentQuestionIndex = Math.max(0, Math.min(index, this.score.totalQuestions - 1));
    return this.save();
};
practiceSessionSchema.methods.complete = function () {
    this.status = 'completed';
    this.completedAt = new Date();
    return this.save();
};
practiceSessionSchema.methods.pause = function () {
    this.status = 'paused';
    return this.save();
};
practiceSessionSchema.methods.resume = function () {
    this.status = 'active';
    return this.save();
};
exports.PracticeSession = mongoose_1.default.model('PracticeSession', practiceSessionSchema);
//# sourceMappingURL=PracticeSession.js.map