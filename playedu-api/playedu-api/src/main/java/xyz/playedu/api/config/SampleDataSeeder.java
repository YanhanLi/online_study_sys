package xyz.playedu.api.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import xyz.playedu.common.domain.AdminUser;
import xyz.playedu.common.domain.Department;
import xyz.playedu.common.domain.User;
import xyz.playedu.common.exception.NotFoundException;
import xyz.playedu.common.service.AdminUserService;
import xyz.playedu.common.service.DepartmentService;
import xyz.playedu.common.service.UserService;
import xyz.playedu.common.util.StringUtil;
import xyz.playedu.course.domain.Question;
import xyz.playedu.course.domain.Quiz;
import xyz.playedu.course.service.GradeService;
import xyz.playedu.course.service.QuestionService;
import xyz.playedu.course.service.QuizService;
import xyz.playedu.course.service.UserQuizRecordService;

/** Seeds demo data (departments, users, quizzes, grades) for showcasing analytics. */
@Component
@ConditionalOnProperty(prefix = "playedu.seed", name = "enabled", havingValue = "true")
public class SampleDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SampleDataSeeder.class);

    private static final String SEED_MARKER_EMAIL = "learner01@demo.playedu";

    private final Random random = new Random(20241124L);

    @Autowired private DepartmentService departmentService;

    @Autowired private UserService userService;

    @Autowired private AdminUserService adminUserService;

    @Autowired private QuestionService questionService;

    @Autowired private QuizService quizService;

    @Autowired private UserQuizRecordService userQuizRecordService;

    @Autowired private GradeService gradeService;

    @Autowired private ObjectMapper objectMapper;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        boolean force = hasForceFlag(args);
        if (userService.emailIsExists(SEED_MARKER_EMAIL) && !force) {
            log.info("Sample data already present, skipping seeding");
            return;
        }

        AdminUser admin = adminUserService.findByEmail("admin@playedu.xyz");
        if (admin == null) {
            log.warn("Admin account not found, cannot seed demo data");
            return;
        }

        log.info("Seeding PlayEdu demo data ...");
        Map<String, Integer> departmentMap = seedDepartments();
        List<User> users = seedUsers(departmentMap);
        List<Question> questions = seedQuestions(admin.getId());
        List<Quiz> quizzes = seedQuizzes(admin.getId(), questions);
        seedScores(quizzes, users);
        log.info(
                "Demo data ready: departments={}, users={}, questions={}, quizzes={}",
                departmentMap.size(),
                users.size(),
                questions.size(),
                quizzes.size());
    }

    private boolean hasForceFlag(String... args) {
        if (args == null) {
            return false;
        }
        for (String arg : args) {
            if ("--playedu.seed.force=true".equalsIgnoreCase(arg)
                    || "--playedu.seed.force".equalsIgnoreCase(arg)) {
                return true;
            }
        }
        return false;
    }

    private Map<String, Integer> seedDepartments() throws NotFoundException {
        List<String> roots = List.of("研发中心", "销售中心", "人力资源");
        int sort = 1;
        for (String name : roots) {
            ensureDepartment(name, 0, sort++);
        }
        ensureDepartment("后端组", getDepartmentId("研发中心"), 1);
        ensureDepartment("前端组", getDepartmentId("研发中心"), 2);
        ensureDepartment("渠道销售", getDepartmentId("销售中心"), 1);
        ensureDepartment("大客户", getDepartmentId("销售中心"), 2);
        ensureDepartment("招聘管理", getDepartmentId("人力资源"), 1);
        ensureDepartment("培训发展", getDepartmentId("人力资源"), 2);
        return departmentService.all().stream()
                .collect(Collectors.toMap(Department::getName, Department::getId));
    }

    private Integer ensureDepartment(String name, Integer parentId, int sort)
            throws NotFoundException {
        Department exists = departmentService.findByName(name, parentId);
        if (exists != null) {
            return exists.getId();
        }
        return departmentService.create(name, parentId, sort);
    }

    private Integer getDepartmentId(String name) {
        Department department = departmentService.findByName(name, 0);
        return department == null ? 0 : department.getId();
    }

    private List<User> seedUsers(Map<String, Integer> departmentMap) {
        List<Integer> targetDeps = departmentMap.entrySet().stream()
                .filter(e -> !StringUtil.isEmpty(e.getKey()) && e.getValue() != 0)
                .filter(e -> !List.of("研发中心", "销售中心", "人力资源").contains(e.getKey()))
                .map(Map.Entry::getValue)
                .toList();
        List<User> users = new ArrayList<>();
        int existingCount = Math.toIntExact(userService.count());
        int totalToCreate = 60;
        for (int i = 1; i <= totalToCreate; i++) {
            String email = String.format(Locale.CHINA, "learner%02d@demo.playedu", i);
            if (userService.emailIsExists(email)) {
                users.add(userService.find(email));
                continue;
            }
            String name = "学员" + i;
            Integer depId = targetDeps.get(random.nextInt(targetDeps.size()));
            User user =
                    userService.createWithDepIds(
                            email,
                            name,
                            -1,
                            "Passw0rd!",
                            random.nextInt(100) % 3 == 0
                                    ? String.format("3301%014d", existingCount + i)
                                    : null,
                            new Integer[] {depId});
            users.add(user);
        }
        return users;
    }

    private List<Question> seedQuestions(Integer adminId) throws JsonProcessingException {
        List<Question> created = new ArrayList<>();
        for (int i = 1; i <= 40; i++) {
            String content = "关于企业培训第" + i + "题，下列说法正确的是？";
            Question existing =
                    questionService.lambdaQuery().eq(Question::getContent, content).one();
            if (existing != null) {
                created.add(existing);
                continue;
            }
            var options = new ArrayList<Map<String, String>>();
            options.add(Map.of("value", "A", "label", "鼓励主动学习"));
            options.add(Map.of("value", "B", "label", "忽视反馈机制"));
            options.add(Map.of("value", "C", "label", "缺少数据分析"));
            options.add(Map.of("value", "D", "label", "脱离业务场景"));
            String optionsJson = objectMapper.writeValueAsString(options);
            String answerJson = objectMapper.writeValueAsString(List.of("A"));
            Question question =
                    questionService.create(
                            "SINGLE",
                            content,
                            optionsJson,
                            answerJson,
                            5 + random.nextInt(6),
                            adminId);
            created.add(question);
        }
        return created;
    }

    private List<Quiz> seedQuizzes(Integer adminId, List<Question> questions)
            throws NotFoundException {
        if (questions.isEmpty()) {
            return Collections.emptyList();
        }
        List<Integer> questionIds = questions.stream().map(Question::getId).toList();
        List<Quiz> quizzes = new ArrayList<>();
        quizzes.add(
            ensureQuiz(
                "安全生产知识测验",
                "ONLINE_AUTO",
                60,
                null,
                LocalDate.now().minusDays(20),
                slice(questionIds, 0, 10),
                adminId));
        quizzes.add(
            ensureQuiz(
                "新员工入职考试",
                "ONLINE_AUTO",
                70,
                null,
                LocalDate.now().minusDays(35),
                slice(questionIds, 10, 10),
                adminId));
        quizzes.add(
            ensureQuiz(
                "年度制度抽查",
                "ONLINE_AUTO",
                65,
                null,
                LocalDate.now().minusDays(10),
                slice(questionIds, 20, 10),
                adminId));
        quizzes.add(
                ensureQuiz(
                        "线下消防演练考核",
                        "OFFLINE_MANUAL",
                        60,
                        100,
                        LocalDate.now().minusDays(15),
                        Collections.emptyList(),
                        adminId));
        quizzes.add(
                ensureQuiz(
                        "销售策略研讨测评",
                        "OFFLINE_MANUAL",
                        70,
                        100,
                        LocalDate.now().minusDays(5),
                        Collections.emptyList(),
                        adminId));
        return quizzes.stream().distinct().toList();
    }

    private List<Integer> slice(List<Integer> source, int start, int size) {
        if (source.isEmpty()) {
            return Collections.emptyList();
        }
        int safeStart = Math.min(Math.max(start, 0), source.size() - 1);
        int endExclusive = Math.min(safeStart + Math.max(size, 1), source.size());
        if (safeStart >= endExclusive) {
            safeStart = Math.max(0, source.size() - Math.max(size, 1));
            endExclusive = source.size();
        }
        return new ArrayList<>(source.subList(safeStart, endExclusive));
    }

    private Quiz ensureQuiz(
            String title,
            String category,
            Integer passScore,
            Integer totalScore,
            LocalDate examDate,
            List<Integer> selectedQuestions,
            Integer adminId)
            throws NotFoundException {
        Quiz exists = quizService.lambdaQuery().eq(Quiz::getTitle, title).one();
        if (exists != null) {
            return exists;
        }
        Date exam =
                examDate == null
                        ? null
                        : Date.from(
                                LocalDateTime.of(examDate, java.time.LocalTime.of(10, 0))
                                        .atZone(ZoneId.systemDefault())
                                        .toInstant());
        return quizService.create(
                title, category, passScore, totalScore, exam, selectedQuestions, adminId);
    }

    private void seedScores(List<Quiz> quizzes, List<User> users) throws NotFoundException {
        if (quizzes.isEmpty() || users.isEmpty()) {
            return;
        }
        for (Quiz quiz : quizzes) {
            int attempts = 30 + random.nextInt(15);
            for (int i = 0; i < attempts; i++) {
                User user = users.get(random.nextInt(users.size()));
                if (quizService.getQuestionIdList(quiz).isEmpty()) {
                    saveManualRecord(quiz, user);
                } else {
                    saveAutoRecord(quiz, user);
                }
            }
            gradeService.calculateStatistics(quiz.getId(), true);
        }
    }

    private void saveManualRecord(Quiz quiz, User user) {
        int total = quiz.getTotalScore() == null || quiz.getTotalScore() == 0 ? 100 : quiz.getTotalScore();
        int score = 40 + random.nextInt(Math.max(20, total - 39));
        boolean passed = score >= quiz.getPassScore();
        Date takenAt = randomDateWithin(45);
        userQuizRecordService.saveManualScore(
                user.getId(),
                quiz.getId(),
                score,
                passed,
                passed ? "表现稳定" : "需跟进辅导",
                takenAt);
    }

    private void saveAutoRecord(Quiz quiz, User user) {
        int total = quiz.getTotalScore();
        if (total <= 0) {
            total = quizService.getQuestionIdList(quiz).size() * 10;
        }
        int score = Math.max(30, total - random.nextInt(total / 2 + 1));
        boolean passed = score >= quiz.getPassScore();
        Date takenAt = randomDateWithin(30);
        userQuizRecordService.saveManualScore(
                user.getId(),
                quiz.getId(),
                score,
                passed,
                passed ? "自动阅卷通过" : "建议重新练习",
                takenAt);
    }

    private Date randomDateWithin(int days) {
        LocalDate target = LocalDate.now().minusDays(random.nextInt(Math.max(1, days)));
        LocalDateTime ldt = target.atTime(9 + random.nextInt(8), random.nextInt(60));
        return Date.from(ldt.atZone(ZoneId.systemDefault()).toInstant());
    }
}
