import { normalizeProgramTask } from "@/lib/program-journey";

const STARTER_TIERS = ["entry", "core", "coaching"];
const FULL_PROGRAM_TIERS = ["core", "coaching"];

function createOfficialDay(day, fields) {
  return normalizeProgramTask({
    day,
    day_number: day,
    sort_order: day,
    week: Math.ceil(day / 7),
    week_number: Math.ceil(day / 7),
    is_active: true,
    status: "active",
    program_family: "reset_30",
    program_template_key: `day_${String(day).padStart(2, "0")}`,
    tier_access: fields.tier_access,
    title: fields.title,
    short_label: fields.short_label,
    theme: fields.theme,
    description: fields.description,
    why_this_matters: fields.why_this_matters,
    task_instruction: fields.task_instruction,
    reflection_prompt: fields.reflection_prompt,
    journal_placeholder: fields.journal_placeholder,
    question_1: fields.question_1,
    question_2: fields.question_2,
    question_3: fields.question_3,
    completion_button_text: fields.completion_button_text,
    milestone_type: fields.milestone_type || "",
    reward_title: fields.reward_title,
    reward_message: fields.reward_message,
    estimated_minutes: fields.estimated_minutes,
    main_action_instruction: fields.task_instruction,
    main_instruction: fields.task_instruction,
    main_why_it_matters: fields.why_this_matters,
    why_it_matters: fields.why_this_matters,
    points: 10,
    main_points: 10,
    proof_required: "none",
  });
}

export const OFFICIAL_30_DAY_PROGRAM = [
  createOfficialDay(1, {
    title: "Welcome to Your 30-Day Reset",
    short_label: "Start Strong",
    theme: "Foundation",
    description:
      "Today is your starting line. This is not about perfection. This is about finally becoming aware of where you are, what needs to change, and what kind of financial life you want to build.",
    why_this_matters: "Real change starts with honesty. Before growth comes awareness.",
    task_instruction:
      "Open your finances without judgment. Review your current situation and commit to showing up for the next 30 days.",
    reflection_prompt:
      "What made you say yes to this journey, and what do you hope changes after 30 days?",
    journal_placeholder:
      "Write honestly about your current financial reality and your hopes.",
    question_1: "What is your biggest money struggle right now?",
    question_2: "What are you most tired of repeating?",
    question_3: "What would success after 30 days look like for you?",
    completion_button_text: "I'm Ready to Begin",
    milestone_type: "start",
    reward_title: "Day 1 Complete",
    reward_message: "You started. That matters more than you think.",
    estimated_minutes: 10,
    tier_access: STARTER_TIERS,
  }),
  createOfficialDay(2, {
    title: "Face the Numbers",
    short_label: "Know Your Reality",
    theme: "Awareness",
    description:
      "You cannot improve what you avoid. Today is about seeing the truth of your money clearly.",
    why_this_matters: "Clarity removes confusion and gives you control.",
    task_instruction: "Review your balance, income, bills, and recent spending.",
    reflection_prompt: "What part of your financial reality have you been avoiding?",
    journal_placeholder:
      "Write what surprised you most when you looked at your numbers.",
    question_1: "What number stresses you the most?",
    question_2: "What habit seems most expensive?",
    question_3: "What do you want to understand better?",
    completion_button_text: "I Faced It",
    reward_title: "Day 2 Complete",
    reward_message: "You looked at the truth instead of avoiding it.",
    estimated_minutes: 10,
    tier_access: STARTER_TIERS,
  }),
  createOfficialDay(3, {
    title: "Your Money Story",
    short_label: "Origin Check",
    theme: "Mindset",
    description:
      "Your habits often come from beliefs you learned early. Today is about understanding where your money mindset came from.",
    why_this_matters: "Hidden beliefs often control visible behavior.",
    task_instruction: "Reflect on what you learned about money growing up.",
    reflection_prompt:
      "What messages about money shaped you as a child or teenager?",
    journal_placeholder:
      "Write the money lessons you absorbed, whether good or bad.",
    question_1: "What belief still affects you today?",
    question_2: "Which belief is helping you?",
    question_3: "Which belief needs to go?",
    completion_button_text: "I Reflected",
    reward_title: "Day 3 Complete",
    reward_message: "Awareness of your story gives you power to change it.",
    estimated_minutes: 12,
    tier_access: STARTER_TIERS,
  }),
  createOfficialDay(4, {
    title: "Needs vs Wants",
    short_label: "Clear the Blur",
    theme: "Discipline",
    description:
      "Financial peace grows when you can tell the difference between need, want, pressure, and impulse.",
    why_this_matters: "Confusion in spending creates chaos.",
    task_instruction:
      "Review recent expenses and label each one as need, want, pressure, or impulse.",
    reflection_prompt: "Which category controls your spending the most?",
    journal_placeholder: "Be honest about where your money leaks usually happen.",
    question_1: "What is a true need in your life right now?",
    question_2: "What want usually feels urgent?",
    question_3: "What pressure influences your spending?",
    completion_button_text: "I Sorted My Spending",
    reward_title: "Day 4 Complete",
    reward_message: "You are starting to see your spending with more clarity.",
    estimated_minutes: 12,
    tier_access: STARTER_TIERS,
  }),
  createOfficialDay(5, {
    title: "Find Your Triggers",
    short_label: "Spending Triggers",
    theme: "Self-Awareness",
    description:
      "Spending often begins with emotion before it becomes a transaction.",
    why_this_matters: "If you know your triggers, you can interrupt them.",
    task_instruction:
      "Identify emotional, social, or environmental triggers that lead to overspending.",
    reflection_prompt: "What emotions or situations usually push you to spend?",
    journal_placeholder: "List the moments when spending feels most tempting.",
    question_1: "Do you spend more when stressed?",
    question_2: "Do certain people influence your spending?",
    question_3: "What trigger do you want to watch closely this week?",
    completion_button_text: "I Found My Triggers",
    reward_title: "Day 5 Complete",
    reward_message: "You found the moments that usually pull you off track.",
    estimated_minutes: 10,
    tier_access: STARTER_TIERS,
  }),
  createOfficialDay(6, {
    title: "Audit Your Week",
    short_label: "Week Review",
    theme: "Review",
    description: "Small reviews create strong awareness.",
    why_this_matters: "Weekly reflection helps you catch patterns early.",
    task_instruction:
      "Review your last 7 days of spending and identify top categories and weak points.",
    reflection_prompt: "What pattern did you notice this week?",
    journal_placeholder: "Write the most important lesson from your last 7 days.",
    question_1: "Where did most of your money go?",
    question_2: "What spending felt intentional?",
    question_3: "What would you change next week?",
    completion_button_text: "Week Reviewed",
    reward_title: "Day 6 Complete",
    reward_message: "Reviewing your week helps you catch patterns earlier.",
    estimated_minutes: 10,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(7, {
    title: "First Checkpoint",
    short_label: "Week 1 Win",
    theme: "Milestone",
    description:
      "You made it through your first week. Progress starts with consistency.",
    why_this_matters: "Celebration builds motivation.",
    task_instruction:
      "Review your first 7 days and identify one win, one lesson, and one adjustment.",
    reflection_prompt: "What are you proud of after your first week?",
    journal_placeholder: "Write your honest first-week reflection.",
    question_1: "What improved?",
    question_2: "What stayed hard?",
    question_3: "What will you do differently in Week 2?",
    completion_button_text: "Week 1 Complete",
    milestone_type: "checkpoint",
    reward_title: "Week 1 Finished",
    reward_message: "One full week of awareness is already changing you.",
    estimated_minutes: 12,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(8, {
    title: "Build a Simple Spending Plan",
    short_label: "Plan Your Money",
    theme: "Planning",
    description: "A plan gives your money direction before life spends it for you.",
    why_this_matters: "Unplanned money disappears fast.",
    task_instruction: "Create a simple spending plan for the next 7 days.",
    reflection_prompt: "What must your money cover first this week?",
    journal_placeholder: "Write the top priorities your money needs to serve.",
    question_1: "What comes first?",
    question_2: "What can wait?",
    question_3: "What limit do you want to set?",
    completion_button_text: "Plan Created",
    reward_title: "Day 8 Complete",
    reward_message: "You gave your money direction before the week could take over.",
    estimated_minutes: 12,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(9, {
    title: "Protect Essentials",
    short_label: "Essentials First",
    theme: "Security",
    description: "Stability begins when essentials are protected before extras.",
    why_this_matters: "Covering essentials first lowers stress.",
    task_instruction:
      "List your non-negotiable essentials and compare them to your spending.",
    reflection_prompt: "Are your essentials being protected well?",
    journal_placeholder: "Write the essentials that matter most in your life.",
    question_1: "Which essentials are strongest?",
    question_2: "Which essentials are underfunded?",
    question_3: "What needs more protection?",
    completion_button_text: "Essentials Protected",
    reward_title: "Day 9 Complete",
    reward_message: "Protecting essentials is a real form of financial peace.",
    estimated_minutes: 10,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(10, {
    title: "Reduce One Leak",
    short_label: "Leak Control",
    theme: "Action",
    description:
      "You do not need to fix everything today. Just reduce one financial leak.",
    why_this_matters: "One repeated leak can drain a lot over time.",
    task_instruction:
      "Choose one unnecessary expense pattern to reduce this week.",
    reflection_prompt: "Which money leak are you ready to cut down?",
    journal_placeholder: "Write the leak and your plan to reduce it.",
    question_1: "How often does it happen?",
    question_2: "Why does it keep happening?",
    question_3: "What is your replacement action?",
    completion_button_text: "Leak Chosen",
    reward_title: "Day 10 Complete",
    reward_message: "One strong correction is better than ten vague intentions.",
    estimated_minutes: 10,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(11, {
    title: "Prepare for the Unexpected",
    short_label: "Mini Buffer",
    theme: "Emergency Awareness",
    description: "Even a small buffer can create breathing room.",
    why_this_matters:
      "Unexpected expenses feel less scary when something is set aside.",
    task_instruction:
      "Set or define your smallest realistic emergency buffer goal.",
    reflection_prompt:
      "What kind of unexpected expense usually catches you off guard?",
    journal_placeholder:
      "Write the first emergency fund target you want to aim for.",
    question_1: "What emergency happens most often?",
    question_2: "What amount would help you breathe easier?",
    question_3: "What can you save first?",
    completion_button_text: "Buffer Goal Set",
    reward_title: "Day 11 Complete",
    reward_message: "Breathing room starts with one realistic buffer goal.",
    estimated_minutes: 10,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(12, {
    title: "Review Your Subscriptions and Recurring Costs",
    short_label: "Hidden Drains",
    theme: "Cleanup",
    description:
      "Some expenses quietly stay because we stop questioning them.",
    why_this_matters:
      "Hidden recurring costs are easy to forget but powerful over time.",
    task_instruction:
      "Review all recurring payments, subscriptions, and quiet spending habits.",
    reflection_prompt: "What recurring expense no longer feels worth it?",
    journal_placeholder:
      "Write the recurring costs you want to keep, change, or remove.",
    question_1: "What is still valuable?",
    question_2: "What is wasteful now?",
    question_3: "What can you pause or cancel?",
    completion_button_text: "Recurring Costs Reviewed",
    reward_title: "Day 12 Complete",
    reward_message: "You found the quiet drains that often get ignored.",
    estimated_minutes: 12,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(13, {
    title: "Money and Emotion",
    short_label: "Emotional Spending",
    theme: "Mindset",
    description:
      "Many money decisions are emotional before they are logical.",
    why_this_matters: "Awareness helps you choose instead of react.",
    task_instruction:
      "Think about your last emotional spending moment and what was underneath it.",
    reflection_prompt: "What emotion most affects your money choices?",
    journal_placeholder:
      "Write what you feel before, during, and after emotional spending.",
    question_1: "What emotion appears most often?",
    question_2: "What usually triggers it?",
    question_3: "What healthier response can replace it?",
    completion_button_text: "Emotion Identified",
    reward_title: "Day 13 Complete",
    reward_message: "Naming the emotion makes it easier to respond with intention.",
    estimated_minutes: 12,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(14, {
    title: "Second Checkpoint",
    short_label: "Week 2 Win",
    theme: "Milestone",
    description: "Two weeks in, you are building awareness and control.",
    why_this_matters: "Reflection turns effort into real progress.",
    task_instruction:
      "Review the last 14 days and identify your strongest improvement so far.",
    reflection_prompt:
      "What has changed in your thinking or behavior since Day 1?",
    journal_placeholder:
      "Compare your current mindset with your starting mindset.",
    question_1: "What improved most?",
    question_2: "What remains difficult?",
    question_3: "What are you committed to in Week 3?",
    completion_button_text: "Week 2 Complete",
    milestone_type: "checkpoint",
    reward_title: "Two Weeks Done",
    reward_message: "Your consistency is building a new identity.",
    estimated_minutes: 12,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(15, {
    title: "Midpoint Reset",
    short_label: "Reset and Refocus",
    theme: "Recalibration",
    description:
      "The middle of a journey is where many people drift. Today is your reset.",
    why_this_matters: "Progress stays strong when you recalibrate.",
    task_instruction:
      "Recommit to your top 3 money priorities for the next 15 days.",
    reflection_prompt:
      "What deserves your strongest focus from this point forward?",
    journal_placeholder: "Write the 3 priorities that matter most right now.",
    question_1: "What must improve before Day 30?",
    question_2: "What distraction needs to lose power?",
    question_3: "What is still possible?",
    completion_button_text: "I Reset My Focus",
    milestone_type: "midpoint",
    reward_title: "Midpoint Reached",
    reward_message: "Halfway done. Keep going with intention.",
    estimated_minutes: 12,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(16, {
    title: "Audit Your Environment",
    short_label: "Environment Check",
    theme: "Influence",
    description:
      "Your environment shapes your decisions more than you think.",
    why_this_matters: "A strong system protects you from weak moments.",
    task_instruction:
      "Review the people, apps, habits, and environments that affect your spending.",
    reflection_prompt:
      "What part of your environment helps or hurts your discipline?",
    journal_placeholder:
      "Write the influences around your financial decisions.",
    question_1: "Who helps you stay grounded?",
    question_2: "What apps or places trigger spending?",
    question_3: "What change can improve your environment?",
    completion_button_text: "Environment Reviewed",
    reward_title: "Day 16 Complete",
    reward_message: "Your environment matters more than willpower alone.",
    estimated_minutes: 10,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(17, {
    title: "Your Financial Priorities",
    short_label: "Priority Alignment",
    theme: "Direction",
    description: "Money flows better when your values are clear.",
    why_this_matters: "Priorities reduce confusion and guilt.",
    task_instruction:
      "List your top 3 financial priorities for this season of life.",
    reflection_prompt: "What matters most to you financially right now?",
    journal_placeholder:
      "Write what your money should support first in this season.",
    question_1: "What is urgent?",
    question_2: "What is important but not urgent?",
    question_3: "What no longer deserves your money?",
    completion_button_text: "Priorities Chosen",
    reward_title: "Day 17 Complete",
    reward_message: "Clear priorities make your money decisions easier.",
    estimated_minutes: 10,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(18, {
    title: "Practice Saying No",
    short_label: "Boundaries",
    theme: "Discipline",
    description: "Every strong financial life includes boundaries.",
    why_this_matters: "Saying no protects what matters more.",
    task_instruction:
      "Identify one spending pressure you need to resist this week.",
    reflection_prompt: "Where do you need stronger money boundaries?",
    journal_placeholder:
      "Write the situations where you struggle to say no.",
    question_1: "Who or what pressures you?",
    question_2: "Why is it hard to resist?",
    question_3: "What boundary sentence can you use?",
    completion_button_text: "Boundary Set",
    reward_title: "Day 18 Complete",
    reward_message: "Boundaries protect the future you care about.",
    estimated_minutes: 10,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(19, {
    title: "Rebuild Confidence",
    short_label: "Trust Yourself Again",
    theme: "Confidence",
    description:
      "Even if you made mistakes before, you can still become someone who handles money wisely.",
    why_this_matters: "Shame blocks action; confidence supports growth.",
    task_instruction: "Write down proof that you are already improving.",
    reflection_prompt:
      "What signs show that you are growing, even if slowly?",
    journal_placeholder: "Write your progress evidence honestly.",
    question_1: "What are you handling better now?",
    question_2: "What past mistake are you releasing?",
    question_3: "What kind of person are you becoming?",
    completion_button_text: "Confidence Rebuilt",
    reward_title: "Day 19 Complete",
    reward_message: "Confidence grows when you can see the evidence of change.",
    estimated_minutes: 10,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(20, {
    title: "Plan a Better Next Week",
    short_label: "Forward Planning",
    theme: "Preparation",
    description:
      "Planning ahead protects you from preventable mistakes.",
    why_this_matters: "Good weeks are usually prepared, not accidental.",
    task_instruction: "Build a simple plan for next week's key expenses.",
    reflection_prompt: "What upcoming expense needs preparation now?",
    journal_placeholder:
      "Write the next week expenses you want to handle well.",
    question_1: "What is coming soon?",
    question_2: "What can you prepare now?",
    question_3: "What would make next week smoother?",
    completion_button_text: "Next Week Planned",
    reward_title: "Day 20 Complete",
    reward_message: "Preparation makes better weeks more likely.",
    estimated_minutes: 10,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(21, {
    title: "Third Checkpoint",
    short_label: "Week 3 Win",
    theme: "Milestone",
    description: "Three weeks of effort is no small thing.",
    why_this_matters: "Momentum grows when it is acknowledged.",
    task_instruction:
      "Review the last 21 days and identify your biggest shift.",
    reflection_prompt:
      "What has changed most in how you see and handle money?",
    journal_placeholder:
      "Write the biggest transformation you notice so far.",
    question_1: "What habit is changing?",
    question_2: "What is still being tested?",
    question_3: "What do you want to finish strong?",
    completion_button_text: "Week 3 Complete",
    milestone_type: "checkpoint",
    reward_title: "Week 3 Finished",
    reward_message:
      "Your progress is no longer accidental. It is becoming a lifestyle.",
    estimated_minutes: 12,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(22, {
    title: "Small Wins Matter",
    short_label: "Notice Progress",
    theme: "Encouragement",
    description:
      "You do not need a perfect month to build a better life.",
    why_this_matters: "Small wins keep people moving.",
    task_instruction:
      "List at least 3 small financial wins from this journey.",
    reflection_prompt:
      "What small progress are you finally learning to appreciate?",
    journal_placeholder:
      "Write the wins you usually ignore but should celebrate.",
    question_1: "What did you do better?",
    question_2: "What temptation did you resist?",
    question_3: "What deserves recognition?",
    completion_button_text: "Wins Noticed",
    reward_title: "Day 22 Complete",
    reward_message:
      "Small wins still count. They are part of the transformation.",
    estimated_minutes: 10,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(23, {
    title: "Review Your Weak Spot",
    short_label: "Honest Weakness",
    theme: "Growth",
    description:
      "Growth becomes stronger when you stop hiding your weakest area.",
    why_this_matters: "Honest review creates better strategy.",
    task_instruction:
      "Identify your weakest money habit and define your next correction step.",
    reflection_prompt: "What weak area still needs serious work?",
    journal_placeholder:
      "Write the habit that still needs healing and structure.",
    question_1: "Why does it continue?",
    question_2: "What pattern feeds it?",
    question_3: "What is your correction plan?",
    completion_button_text: "Weak Spot Reviewed",
    reward_title: "Day 23 Complete",
    reward_message:
      "Honesty creates better strategy than avoidance ever will.",
    estimated_minutes: 10,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(24, {
    title: "Align Money With Your Future",
    short_label: "Future Vision",
    theme: "Purpose",
    description:
      "Money becomes more powerful when connected to vision.",
    why_this_matters: "Vision helps discipline feel meaningful.",
    task_instruction:
      "Think about the future you want and what money habits support it.",
    reflection_prompt: "What kind of life are you trying to build?",
    journal_placeholder:
      "Write the future version of your life that needs better habits now.",
    question_1: "What future matters most?",
    question_2: "What habit supports that future?",
    question_3: "What habit threatens it?",
    completion_button_text: "Future Aligned",
    reward_title: "Day 24 Complete",
    reward_message: "Vision turns discipline into something worth protecting.",
    estimated_minutes: 12,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(25, {
    title: "Prepare a Personal Rule",
    short_label: "Your Rule",
    theme: "Self-Leadership",
    description: "Personal rules reduce decision fatigue.",
    why_this_matters:
      "A clear rule is easier to follow than vague intention.",
    task_instruction:
      "Create one personal money rule you will begin following.",
    reflection_prompt: "What rule would protect you most right now?",
    journal_placeholder: "Write your rule and why it matters.",
    question_1: "What is the rule?",
    question_2: "When will you use it?",
    question_3: "How will it help you?",
    completion_button_text: "Rule Created",
    reward_title: "Day 25 Complete",
    reward_message: "A strong personal rule protects you on hard days.",
    estimated_minutes: 10,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(26, {
    title: "Make Room to Breathe",
    short_label: "Reduce Pressure",
    theme: "Simplicity",
    description:
      "Financial pressure can be reduced when you simplify.",
    why_this_matters: "Simplicity creates space for better choices.",
    task_instruction:
      "Identify one area of money stress you can simplify this week.",
    reflection_prompt:
      "What feels unnecessarily complicated right now?",
    journal_placeholder: "Write what you want to simplify and why.",
    question_1: "What causes pressure?",
    question_2: "What can become simpler?",
    question_3: "What would relief look like?",
    completion_button_text: "Simplicity Chosen",
    reward_title: "Day 26 Complete",
    reward_message: "Simplifying pressure makes wise decisions easier.",
    estimated_minutes: 10,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(27, {
    title: "Review Your Identity Shift",
    short_label: "New Identity",
    theme: "Transformation",
    description:
      "This is no longer just about tasks. It is about who you are becoming.",
    why_this_matters:
      "Lasting habits grow from identity, not temporary motivation.",
    task_instruction:
      "Reflect on the identity of the person you are becoming through this journey.",
    reflection_prompt:
      "Who are you becoming in the way you handle money?",
    journal_placeholder:
      "Write about the identity shift you feel most deeply.",
    question_1: "What are you no longer tolerating?",
    question_2: "What are you building now?",
    question_3: "What identity do you want to keep after Day 30?",
    completion_button_text: "Identity Reviewed",
    reward_title: "Day 27 Complete",
    reward_message:
      "You are not just finishing tasks. You are becoming someone new.",
    estimated_minutes: 12,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(28, {
    title: "Final Week Strategy",
    short_label: "Finish Strong",
    theme: "Momentum",
    description:
      "The finish matters. Strong endings create lasting memory and confidence.",
    why_this_matters:
      "Your last week can set the tone for what continues next.",
    task_instruction:
      "Set your strategy for finishing the program with honesty and strength.",
    reflection_prompt: "What will finishing strong look like for you?",
    journal_placeholder: "Write your final week intention and commitment.",
    question_1: "What still needs attention?",
    question_2: "What strength will carry you?",
    question_3: "How will you stay intentional?",
    completion_button_text: "Final Week Set",
    reward_title: "Day 28 Complete",
    reward_message: "Strong endings create confidence you can carry forward.",
    estimated_minutes: 10,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(29, {
    title: "Prepare Your Next 30 Days",
    short_label: "Beyond This Program",
    theme: "Continuation",
    description: "This journey should continue beyond one month.",
    why_this_matters: "Sustainable growth needs continuation.",
    task_instruction:
      "Create a simple plan for your next 30 days after this program ends.",
    reflection_prompt:
      "What habits do you want to continue after this challenge?",
    journal_placeholder:
      "Write the habits, priorities, and systems you want to carry forward.",
    question_1: "What will you keep?",
    question_2: "What will you improve further?",
    question_3: "What support do you need next?",
    completion_button_text: "Next 30 Days Planned",
    reward_title: "Day 29 Complete",
    reward_message:
      "What comes next matters just as much as what you finished here.",
    estimated_minutes: 12,
    tier_access: FULL_PROGRAM_TIERS,
  }),
  createOfficialDay(30, {
    title: "Completion and Commitment",
    short_label: "Graduation Day",
    theme: "Milestone",
    description:
      "You made it to Day 30. This is not the end. This is proof that you can follow through and build a better financial life.",
    why_this_matters: "Completion builds confidence and identity.",
    task_instruction:
      "Reflect on your full journey and make one lasting commitment for the future.",
    reflection_prompt:
      "What has changed in you most over these 30 days?",
    journal_placeholder:
      "Write your final reflection and commitment moving forward.",
    question_1: "What are you most proud of?",
    question_2: "What changed most in your mindset?",
    question_3: "What is your lasting commitment?",
    completion_button_text: "I Completed the Journey",
    milestone_type: "graduation",
    reward_title: "30 Days Complete",
    reward_message:
      "You finished. Honor this version of yourself and keep building.",
    estimated_minutes: 15,
    tier_access: FULL_PROGRAM_TIERS,
  }),
];

export const OFFICIAL_30_DAY_PROGRAM_BY_DAY = new Map(
  OFFICIAL_30_DAY_PROGRAM.map((day) => [Number(day.day), day])
);

export function getOfficialProgramDay(dayNumber) {
  return OFFICIAL_30_DAY_PROGRAM_BY_DAY.get(Number(dayNumber)) || null;
}

export function buildOfficialProgramTaskPayload(dayDefinition, overrides = {}) {
  const day = Number(dayDefinition.day || dayDefinition.day_number || 1);
  const week = Number(dayDefinition.week || dayDefinition.week_number || Math.ceil(day / 7));
  const normalized = normalizeProgramTask({
    ...dayDefinition,
    ...overrides,
    day,
    day_number: day,
    week,
    week_number: week,
    sort_order: Number(dayDefinition.sort_order || day),
  });

  return {
    title: normalized.title,
    short_label: normalized.short_label,
    theme: normalized.theme,
    description: normalized.description,
    why_this_matters: normalized.why_this_matters,
    task_instruction: normalized.task_instruction,
    reflection_prompt: normalized.reflection_prompt,
    journal_placeholder: normalized.journal_placeholder,
    question_1: normalized.question_1,
    question_2: normalized.question_2,
    question_3: normalized.question_3,
    completion_button_text: normalized.completion_button_text,
    milestone_type: normalized.milestone_type || null,
    reward_title: normalized.reward_title,
    reward_message: normalized.reward_message,
    estimated_minutes: Number(normalized.estimated_minutes || 10),
    tier_access: normalized.tier_access?.length
      ? normalized.tier_access
      : ["entry", "core", "coaching"],
    is_active: normalized.is_active !== false,
    status: normalized.is_active === false ? "inactive" : "active",
    sort_order: Number(normalized.sort_order || day),
    day,
    day_number: day,
    week,
    week_number: week,
    program_family: normalized.program_family || "reset_30",
    program_template_key:
      normalized.program_template_key || `day_${String(day).padStart(2, "0")}`,
    main_action_instruction: normalized.task_instruction,
    main_instruction: normalized.task_instruction,
    main_why_it_matters: normalized.why_this_matters,
    why_it_matters: normalized.why_this_matters,
    points: Number(normalized.points ?? normalized.main_points ?? 10),
    main_points: Number(normalized.main_points ?? normalized.points ?? 10),
    proof_required: normalized.proof_required || "none",
  };
}
