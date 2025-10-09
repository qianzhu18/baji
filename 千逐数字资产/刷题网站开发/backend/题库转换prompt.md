{
  "interactionFlow": {
    "step1": {
      "goal": "启动任务的第一步：仅向用户提问，以确定出题顺序。",
      "action": "作为AI，你的第一个回复必须是，也只能是下面这句问话。不要生成任何代码，不要解释，也不要请求文件。",
      "promptToUser": "您好！在为您生成刷题网页之前，请问您希望题目是按顺序出还是随机出？"
    },
    "step2": {
      "goal": "在收到用户的选择和文件后，生成功能完整的刷题网页。",
      "trigger": "此步骤仅在用户明确回答了"顺序"或"随机"，并上传了题库文件之后才能启动。",
      "instructions": {
        "taskGoal": "根据用户选择和文件，创建一个功能完善、用于刷题的前端网页，需打包在单个HTML文件中。",
        "userChoiceIntegration": {
          "questionOrder": "严格根据用户在第一步中的选择（'顺序'或'随机'）来排列题目。",
          "randomModeBehavior": "如果选择了'随机'模式，程序必须首先一次性地将整个题库顺序打乱，生成一个全新的随机序列。之后，所有面向用户的编号（如"题目 1 / 96"）、导航控制（"上一题"、"下一题"按钮）以及底部的题目导航栏，都必须严格地、唯一地遵循这个新生成的随机序列。题库中题目的原始位置绝不能影响用户的导航流程。"
        },
        "dataSource": {
          "source": "用户在第二步中上传的 Word 文档或其它格式的题库文件。",
          "parsingRules": {
            "questionStructure": "对于选择题，一个问题及其紧随其后的四个选项组成一道完整的题目。对于填空题，一个问题及其对应的一个答案组成一道完整的题目。",
            "numbering": "网页上的题号从 '1' 开始，按顺序连续编号。",
            "optionLabels": "选择题的选项不使用 'A/B/C/D' 标签，按文档顺序排列。",
            "answerIdentification": "对于选择题，源文档中正确选项行的开头有一个句号 '。'，程序需自动识别并设定为正确答案。",
            "commaHandling": "【关键解析逻辑】解析数据时，必须实现一个能够正确处理复杂字段的CSV或文本解析逻辑。简单地使用逗号分割 (e.g., `split(',')`) 或按行分割都是不可接受的，因为它会错误地切分包含复杂代码（例如题干中包含换行符 `\\n` 或引号 `\"` 的 C 代码 `printf(\"...\\n\");`）的内容。解析器必须能将被双引号包裹的、可能包含换行符和逗号的字段内容视为一个完整的、不可分割的单元，确保数据完整性。同时，需保留字段内的原始格式（如换行和空格），以便在网页上正确显示代码缩进和布局。"
          }
        },
        "questionTypeHandling": {
          "typeDetection": "程序需要能自动根据题库文件内容的列数或结构，判断题库是'multipleChoice'（选择题）还是'fillInTheBlank'（填空题）。例如，多于2列通常为选择题，而2列（题干、答案）则为填空题。",
          "fillInTheBlank_UI": {
            "inputComponent": "当题目类型为'fillInTheBlank'时，不应显示选项按钮。取而代之的是，在题干下方提供一个文本输入框（`<input type='text'>`）供用户作答，旁边配有一个'提交答案'按钮。",
            "lockAfterAnswer": "用户点击'提交答案'后，输入框和提交按钮应被锁定，不可再次修改或提交。"
          },
          "fillInTheBlank_Feedback": {
            "isRealtime": true,
            "validationRule": "【严格完全匹配】用户的输入内容必须与题库中提供的答案文本'完全一样'才算正确。这包括大小写、空格、标点符号等。任何细微差别都应判为错误。",
            "correctAnswerDisplay": "提交后，如果答案正确，输入框边框高亮为绿色。",
            "incorrectAnswerDisplay": "如果答案错误，输入框边框高亮为红色，并在其下方清晰地展示'正确答案：[题库中的答案]'。"
          }
        },
        "coreFeatures": {
          "displayMode": "一次只显示一道题目。",
          "feedback": {
            "description": "此反馈逻辑主要适用于选择题（Multiple Choice Questions）。",
            "isRealtime": true,
            "correctAnswerHighlight": "选项背景高亮为绿色。",
            "incorrectAnswerHighlight": "用户选择的错误选项背景高亮为红色。",
            "lockAfterAnswer": "作答后，当前题目的所有选项应被锁定，不可更改。"
          },
          "stateManagement": {
            "persistence": "用户的作答记录（对错状态和选择/填写内容）需要被保存，即使在题目间来回切换也应保留。"
          }
        },
        "navigationAndControl": {
          "freeJump": {
            "enabled": true,
            "component": "在页面最下方创建仅占一行的题目导航栏，栏内所有题号按钮水平排列，当题号过多时可以横向自由滑动。",
            "statusDisplay": {
              "currentQuestion": "用蓝色高亮。",
              "answeredCorrectly": "用绿色标记。",
              "answeredIncorrectly": "用红色标记。"
            }
          },
          "sequentialNav": {
            "enabled": true,
            "components": [
              "上一题按钮",
              "下一题按钮"
            ]
          },
          "scoring": {
            "finishButton": "提供一个'完成练习'按钮，点击后跳转到结果页面。",
            "resultsFormat": "答对题数 / 总题数 (正确率%)",
            "restartButton": "结果页面上有一个'重新开始'按钮，点击后清空所有记录并返回第1题。"
          }
        },
        "designAndTech": {
          "techRequirements": "所有代码（HTML, CSS, JavaScript）必须包含在单个文件中。",
          "visualStyle": "界面设计应现代、简洁、美观，使用 Tailwind CSS进行样式设计。",
          "responsiveDesign": "优先确保在手机上有良好的显示效果和使用体验。",
          "visualEffects": "页面所有状态更新（如选择选项、切换题目）必须是静态的，立即完成，不允许使用任何过渡动画或闪烁效果。"
        }
      }
    }
  },
  "overallInstruction": "严格遵循 'interactionFlow' 中定义的步骤进行交互。在未完成第一步并满足第二步的触发条件前，绝对不要执行第二步的指令。"
}