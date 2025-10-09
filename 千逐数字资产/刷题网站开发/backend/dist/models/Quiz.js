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
exports.Quiz = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const questionSchema = new mongoose_1.Schema({
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
const quizSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
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
        transform: function (doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});
quizSchema.index({ userId: 1, createdAt: -1 });
quizSchema.index({ title: 'text', description: 'text' });
quizSchema.index({ status: 1 });
quizSchema.index({ isPublic: 1, status: 1 });
quizSchema.pre('save', function (next) {
    if (this.isModified('questions')) {
        this.stats.totalQuestions = this.questions.length;
        this.stats.questionTypes = {
            multipleChoice: 0,
            shortAnswer: 0,
            trueFalse: 0,
            fillBlank: 0
        };
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
                }
                else if (avgScore <= 2.5) {
                    this.stats.averageDifficulty = 'medium';
                }
                else {
                    this.stats.averageDifficulty = 'hard';
                }
            }
        }
    }
    next();
});
exports.Quiz = mongoose_1.default.model('Quiz', quizSchema);
//# sourceMappingURL=Quiz.js.map