
/* =========================================
   SchemeMatch — Government Scheme Finder
   Team Impact X | INNOHACKS 2.0

   All scheme records are fictional demo data.
   They are NOT verified government schemes.
========================================= */

let schemes = [];
let schemesLoaded = false;
let schemeLoadError = "";
let currentResults = [];

/* 1. GET HTML ELEMENTS */

const schemeForm = document.getElementById("scheme-form");
const ageInput = document.getElementById("age");
const stateInput = document.getElementById("state");
const incomeInput = document.getElementById("income");
const occupationInput = document.getElementById("occupation");
const studentStatusGroup = document.getElementById("student-status-group");
const studentStatusInput = document.getElementById("student-status");
const formError = document.getElementById("form-error");

const submitButton = schemeForm
    ? schemeForm.querySelector('button[type="submit"]')
    : null;

const resultsSection = document.getElementById("results");
const resultsSummary = document.getElementById("results-summary");
const categoryFilter = document.getElementById("category-filter");
const schemeResults = document.getElementById("scheme-results");
const noResults = document.getElementById("no-results");
const editAnswersButton = document.getElementById("edit-answers-button");
const schemeDetails = document.getElementById("scheme-details");
const eligibilityPanel = document.getElementById("eligibility-panel");
const matchedList = document.getElementById("matched-list");
const unmetList = document.getElementById("unmet-list");
const unknownList = document.getElementById("unknown-list");
const startAgainButton = document.getElementById("start-again-button");

/* 2. SHOW FORM ERRORS */

function showFormError(message) {
    if (!formError) return;

    formError.textContent = message;
    formError.hidden = message === "";
}

/* 3. SHOW OR HIDE THE STUDENT QUESTION */

function updateStudentField() {
    if (!occupationInput || !studentStatusGroup) return;

    if (occupationInput.value === "student") {
        studentStatusGroup.hidden = false;
    } else {
        studentStatusGroup.hidden = true;

        if (studentStatusInput) {
            studentStatusInput.value = "";
        }
    }
}

if (occupationInput) {
    occupationInput.addEventListener("change", updateStudentField);
}

/* 4. READ AND VALIDATE USER ANSWERS */

function readUserProfile() {
    const age = Number(ageInput.value);
    const income = Number(incomeInput.value);
    const selectedOccupation = occupationInput.value;

    const occupationForMatching = {
        student: "student",
        working: "employed"
    };

    const profile = {
        age: age,
        state: stateInput.value.trim(),
        income: income,
        occupation: occupationForMatching[selectedOccupation] || null,
        selectedOccupation: selectedOccupation,
        studentStatus: studentStatusInput
            ? studentStatusInput.value
            : ""
    };

    if (
        ageInput.value.trim() === "" ||
        !Number.isFinite(age) ||
        age < 1 ||
        age > 120
    ) {
        return { error: "Please enter a valid age between 1 and 120." };
    }

    if (!profile.state) {
        return { error: "Please select your state or union territory." };
    }

    if (
        incomeInput.value.trim() === "" ||
        !Number.isFinite(income) ||
        income < 0
    ) {
        return { error: "Please enter a valid annual family income." };
    }

    if (!selectedOccupation) {
        return { error: "Please select your occupation." };
    }

    if (
        selectedOccupation === "student" &&
        !profile.studentStatus
    ) {
        return { error: "Please select your student status." };
    }

    return { profile: profile };
}

/* 5. EVALUATE ONE ELIGIBILITY CRITERION */

function evaluateCriterion(criterion, profile) {
    const userValue = profile[criterion.key];

    if (criterion.type === "unknown") {
        return "unknown";
    }

    if (
        userValue === undefined ||
        userValue === null ||
        userValue === ""
    ) {
        return "unknown";
    }

    if (criterion.type === "range") {
        if (
            !Number.isFinite(userValue) ||
            !Number.isFinite(criterion.min) ||
            !Number.isFinite(criterion.max)
        ) {
            return "unknown";
        }

        return userValue >= criterion.min &&
            userValue <= criterion.max
            ? "match"
            : "unmet";
    }

    if (criterion.type === "equals") {
        if (criterion.value === undefined) return "unknown";

        return userValue === criterion.value
            ? "match"
            : "unmet";
    }

    if (criterion.type === "max") {
        if (
            !Number.isFinite(userValue) ||
            !Number.isFinite(criterion.value)
        ) {
            return "unknown";
        }

        return userValue <= criterion.value
            ? "match"
            : "unmet";
    }

    if (criterion.type === "min") {
        if (
            !Number.isFinite(userValue) ||
            !Number.isFinite(criterion.value)
        ) {
            return "unknown";
        }

        return userValue >= criterion.value
            ? "match"
            : "unmet";
    }

    if (criterion.type === "in") {
        if (!Array.isArray(criterion.values)) {
            return "unknown";
        }

        if (criterion.allIndia === true) {
            return "match";
        }

        return criterion.values.includes(userValue)
            ? "match"
            : "unmet";
    }

    return "unknown";
}

/* 6. EVALUATE A SCHEME */

function evaluateScheme(scheme, profile) {
    const result = {
        scheme: scheme,
        matched: [],
        unmet: [],
        unknown: [],
        potentialMatch: false
    };

    scheme.criteria.forEach(function (criterion) {
        const status = evaluateCriterion(criterion, profile);

        if (status === "match") {
            result.matched.push(criterion);
        } else if (status === "unmet") {
            result.unmet.push(criterion);
        } else {
            result.unknown.push(criterion);
        }
    });

    // Unknown criteria do not prove eligibility.
    result.potentialMatch = result.unmet.length === 0;

    return result;
}

/* 7. FORMAT SAMPLE BENEFITS */

function getBenefitSummary(benefit) {
    benefit = benefit || {};

    const summary = benefit.description ||
        "Benefit details need verification.";

    if (Number.isFinite(benefit.amountINR)) {
        return summary + " (sample amount: ₹" +
            benefit.amountINR.toLocaleString("en-IN") + ")";
    }

    return summary;
}

/* 8. CREATE A SCHEME RESULT CARD */

function createSchemeCard(result) {
    const scheme = result.scheme;
    const card = document.createElement("article");
    card.className = "scheme-card";

    const title = document.createElement("h3");
    title.textContent = scheme.name;

    const description = document.createElement("p");
    description.textContent = scheme.description;

    const category = document.createElement("span");
    category.className = "scheme-category";
    category.textContent = scheme.category;

    const benefit = document.createElement("p");
    benefit.className = "scheme-benefit";
    benefit.textContent = "Sample benefit: " +
        getBenefitSummary(scheme.benefit);

    const demoNotice = document.createElement("p");
    demoNotice.className = "scheme-status scheme-status-demo";
    demoNotice.textContent =
        "Demo example — not a verified government scheme.";

    const status = document.createElement("p");
    status.className = "scheme-status scheme-status-match";

    if (result.unknown.length > 0) {
        status.textContent =
            "Potential match: some eligibility criteria need verification.";
    } else {
        status.textContent =
            "Demo criteria matched. This does not confirm real-world eligibility.";
    }

    const matchedText = document.createElement("p");
    matchedText.className = "scheme-stat scheme-stat-matched";
    matchedText.textContent =
        "Criteria matched: " + result.matched.length;

    const unknownText = document.createElement("p");
    unknownText.className = "scheme-stat scheme-stat-unknown";
    unknownText.textContent =
        "Criteria needing verification: " + result.unknown.length;

    const detailsButton = document.createElement("button");
    detailsButton.type = "button";
    detailsButton.className = "button button-secondary";
    detailsButton.textContent = "View eligibility details";

    detailsButton.addEventListener("click", function () {
        showSchemeDetails(result);
    });

    [
        category,
        title,
        description,
        benefit,
        demoNotice,
        status,
        matchedText,
        unknownText,
        detailsButton
    ].forEach(function (element) {
        card.appendChild(element);
    });

    return card;
}

/* 9. RENDER RESULTS */

function renderResults() {
    if (
        !schemeResults ||
        !categoryFilter ||
        !noResults ||
        !resultsSummary
    ) {
        return;
    }

    schemeResults.replaceChildren();

    const selectedCategory = categoryFilter.value;

    const filteredResults = currentResults.filter(function (result) {
        return selectedCategory === "all" ||
            result.scheme.category === selectedCategory;
    });

    if (filteredResults.length === 0) {
        noResults.hidden = false;
        schemeResults.hidden = true;
    } else {
        noResults.hidden = true;
        schemeResults.hidden = false;

        filteredResults.forEach(function (result) {
            schemeResults.appendChild(createSchemeCard(result));
        });
    }

    resultsSummary.textContent =
        filteredResults.length +
        " potential demo match(es) found. These examples are fictional " +
        "and do not confirm eligibility.";

    if (schemeDetails) {
        schemeDetails.replaceChildren();
        schemeDetails.hidden = true;
    }
    if (eligibilityPanel) {
        if (matchedList) matchedList.replaceChildren();
        if (unmetList) unmetList.replaceChildren();
        if (unknownList) unknownList.replaceChildren();
        eligibilityPanel.hidden = true;
    }
}

/* 10. SHOW SCHEME DETAILS */

function showSchemeDetails(result) {
    if (!schemeDetails || !eligibilityPanel) return;

    const scheme = result.scheme;

    schemeDetails.replaceChildren();
    schemeDetails.hidden = false;

    const title = document.createElement("h3");
    title.textContent = scheme.name;

    const notice = document.createElement("p");
    notice.className = "scheme-details-notice";
    notice.textContent =
        "This is fictional demo data, not an official government scheme.";

    const explanation = document.createElement("p");
    explanation.className = "scheme-details-explanation";
    explanation.textContent =
        "Review these criteria classifications. A match against demo " +
        "criteria does not establish actual eligibility.";

    const benefit = document.createElement("p");
    benefit.className = "scheme-details-benefit";
    benefit.textContent = "Fictional sample benefit: " +
        getBenefitSummary(scheme.benefit);

    [title, notice, explanation, benefit].forEach(function (element) {
        schemeDetails.appendChild(element);
    });

    renderEligibilityAnalysis(result);

    schemeDetails.setAttribute("tabindex", "-1");
    schemeDetails.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
    schemeDetails.focus({ preventScroll: true });
}

/* 11. CREATE LIST ITEMS SAFELY */

function createListItem(text) {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
}

/* 12. SHOW MATCHED, UNMET AND UNKNOWN CRITERIA */

function renderEligibilityAnalysis(result) {
    if (
        !matchedList ||
        !unmetList ||
        !unknownList ||
        !eligibilityPanel
    ) {
        return;
    }

    matchedList.replaceChildren();
    unmetList.replaceChildren();
    unknownList.replaceChildren();

    result.matched.forEach(function (item) {
        matchedList.appendChild(createListItem(item.label));
    });

    result.unmet.forEach(function (item) {
        unmetList.appendChild(createListItem(item.label));
    });

    result.unknown.forEach(function (item) {
        unknownList.appendChild(createListItem(item.label));
    });

    if (result.matched.length === 0) {
        matchedList.appendChild(createListItem(
            "No criteria have been confirmed as matched."
        ));
    }

    if (result.unmet.length === 0) {
        unmetList.appendChild(createListItem(
            "No unmet criteria identified in this demo."
        ));
    }

    if (result.unknown.length === 0) {
        unknownList.appendChild(createListItem(
            "No unknown criteria in this demo record."
        ));
    }

    eligibilityPanel.hidden = false;
}

/* 13. HANDLE FORM SUBMISSION */

if (schemeForm) {
    schemeForm.addEventListener("submit", function (event) {
        event.preventDefault();
        showFormError("");

        if (!schemesLoaded) {
            showFormError(
                schemeLoadError ||
                "Scheme data is still loading. Please wait before submitting."
            );
            return;
        }

        const formData = readUserProfile();

        if (formData.error) {
            showFormError(formData.error);
            return;
        }

        currentResults = schemes
            .map(function (scheme) {
                return evaluateScheme(scheme, formData.profile);
            })
            .filter(function (result) {
                return result.potentialMatch;
            });

        if (categoryFilter) categoryFilter.value = "all";

        renderResults();

        if (resultsSection) {
            resultsSection.hidden = false;
            resultsSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
            if (resultsSummary) {
                resultsSummary.setAttribute("tabindex", "-1");
                resultsSummary.focus({ preventScroll: true });
            }
        }
    });
}

/* 14. CATEGORY FILTER */

if (categoryFilter) {
    categoryFilter.addEventListener("change", renderResults);
}

/* 15. EDIT ANSWERS */

function handleEditAnswers() {
    if (resultsSection) resultsSection.hidden = true;

    if (schemeDetails) {
        schemeDetails.replaceChildren();
        schemeDetails.hidden = true;
    }

    if (eligibilityPanel) {
        if (matchedList) matchedList.replaceChildren();
        if (unmetList) unmetList.replaceChildren();
        if (unknownList) unknownList.replaceChildren();
        eligibilityPanel.hidden = true;
    }

    showFormError("");

    const formSection = document.getElementById("find-schemes");

    if (formSection) {
        formSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    if (ageInput) {
        ageInput.focus({ preventScroll: true });
    }
}

const editAnswersButtons = document.querySelectorAll(
    "#edit-answers-button, #edit-answers-results-button"
);
editAnswersButtons.forEach(function (button) {
    button.addEventListener("click", handleEditAnswers);
});

/* 16. START AGAIN */

if (startAgainButton) {
    startAgainButton.addEventListener("click", function () {
        if (schemeForm) schemeForm.reset();

        showFormError("");
        currentResults = [];

        if (categoryFilter) categoryFilter.value = "all";
        if (schemeResults) schemeResults.replaceChildren();
        if (resultsSummary) resultsSummary.textContent = "";

        if (schemeDetails) {
            schemeDetails.replaceChildren();
            schemeDetails.hidden = true;
        }

        if (eligibilityPanel) {
            if (matchedList) matchedList.replaceChildren();
            if (unmetList) unmetList.replaceChildren();
            if (unknownList) unknownList.replaceChildren();
            eligibilityPanel.hidden = true;
        }

        if (noResults) noResults.hidden = true;
        if (resultsSection) resultsSection.hidden = true;

        updateStudentField();

        const formSection = document.getElementById("find-schemes");

        if (formSection) {
            formSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }

        if (ageInput) {
            ageInput.focus({ preventScroll: true });
        }
    });
}

/* 17. CONVERT JSON RECORDS TO MATCHING FORMAT */

function convertBackendScheme(scheme) {
    if (
        !scheme ||
        typeof scheme !== "object" ||
        typeof scheme.name !== "string" ||
        typeof scheme.category !== "string" ||
        typeof scheme.description !== "string"
    ) {
        throw new Error(
            "A scheme record is missing its name, category, or description."
        );
    }

    const eligibility = scheme.eligibility &&
        typeof scheme.eligibility === "object"
        ? scheme.eligibility
        : {};

    const criteria = [];

    if (
        Number.isFinite(eligibility.minimumAge) &&
        Number.isFinite(eligibility.maximumAge)
    ) {
        criteria.push({
            key: "age",
            type: "range",
            min: eligibility.minimumAge,
            max: eligibility.maximumAge,
            label: "Age must be between " +
                eligibility.minimumAge + " and " +
                eligibility.maximumAge
        });
    } else {
        criteria.push({
            key: "age",
            type: "unknown",
            label: "Age requirements need verification"
        });
    }

    if (Number.isFinite(eligibility.maximumAnnualFamilyIncome)) {
        criteria.push({
            key: "income",
            type: "max",
            value: eligibility.maximumAnnualFamilyIncome,
            label: "Annual family income must be ₹" +
                eligibility.maximumAnnualFamilyIncome.toLocaleString("en-IN") +
                " or less"
        });
    } else {
        criteria.push({
            key: "income",
            type: "unknown",
            label: "Income requirements need verification"
        });
    }

    if (
        Array.isArray(eligibility.occupation) &&
        eligibility.occupation.length > 0 &&
        eligibility.occupation.every(function (occupation) {
            return typeof occupation === "string";
        })
    ) {
        criteria.push({
            key: "occupation",
            type: "in",
            values: eligibility.occupation,
            label: "Applicant occupation must be one of: " +
                eligibility.occupation.join(", ")
        });
    } else {
        criteria.push({
            key: "occupation",
            type: "unknown",
            label: "Occupation requirements need verification"
        });
    }

    if (
        Array.isArray(eligibility.states) &&
        eligibility.states.length > 0 &&
        eligibility.states.every(function (state) {
            return typeof state === "string";
        })
    ) {
        const allIndia = eligibility.states.some(function (state) {
            return state.toLowerCase() === "all india";
        });

        criteria.push({
            key: "state",
            type: "in",
            values: eligibility.states,
            allIndia: allIndia,
            label: allIndia
                ? "State eligibility includes All India"
                : "Applicant state must be one of: " +
                    eligibility.states.join(", ")
        });
    } else {
        criteria.push({
            key: "state",
            type: "unknown",
            label: "State requirements need verification"
        });
    }

    const benefit = scheme.benefit &&
        typeof scheme.benefit === "object"
        ? scheme.benefit
        : {};

    return {
        id: scheme.id,
        name: scheme.name,
        category: scheme.category,
        description: scheme.description,
        criteria: criteria,
        benefit: {
            description: typeof benefit.description === "string"
                ? benefit.description
                : "",
            amountINR: Number.isFinite(benefit.amountINR)
                ? benefit.amountINR
                : null,
            fictionalAmount: benefit.fictionalAmount === true
        },
        fictional: scheme.fictional === true,
        verified: false
    };
}

/* 18. BUILD THE CATEGORY FILTER */

function updateCategoryOptions() {
    if (!categoryFilter) return;

    const selectedCategory = categoryFilter.value;

    const categories = Array.from(new Set(
        schemes.map(function (scheme) {
            return scheme.category;
        })
    )).sort();

    categoryFilter.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All categories";
    categoryFilter.appendChild(allOption);

    categories.forEach(function (category) {
        const option = document.createElement("option");
        option.value = category;
        option.textContent =
            category.charAt(0).toUpperCase() + category.slice(1);

        categoryFilter.appendChild(option);
    });

    categoryFilter.value = categories.includes(selectedCategory)
        ? selectedCategory
        : "all";
}

/* 19. LOAD SCHEMES FROM THE FRONTEND JSON FILE
   Place schemes.json beside index.html and script.js. */

async function loadSchemesFromBackend() {
    if (submitButton) submitButton.disabled = true;

    try {
        console.log("Loading SchemeMatch demo schemes...");

        const response = await fetch("./schemes.json");

        if (!response.ok) {
            throw new Error(
                "Could not load schemes.json. HTTP status: " +
                response.status
            );
        }

        const data = await response.json();

        // Supports a direct JSON array or { "schemes": [...] }.
        const schemeRecords = Array.isArray(data)
            ? data
            : data && Array.isArray(data.schemes)
                ? data.schemes
                : null;

        if (!schemeRecords || schemeRecords.length === 0) {
            throw new Error(
                "The JSON file does not contain any schemes."
            );
        }

        schemes = schemeRecords.map(convertBackendScheme);

        updateCategoryOptions();

        schemesLoaded = true;
        schemeLoadError = "";

        if (submitButton) submitButton.disabled = false;

        showFormError("");

        console.log(
            "Successfully loaded " + schemes.length +
            " fictional demo schemes."
        );
    } catch (error) {
        schemesLoaded = false;

        schemeLoadError =
            "Could not load demo schemes. Check that schemes.json " +
            "is inside the frontend folder.";

        showFormError(schemeLoadError);

        console.error(
            "SchemeMatch demo data loading failed:",
            error
        );
    }
}

/* 20. INITIALIZE */

updateStudentField();
loadSchemesFromBackend();

console.log(
    "SchemeMatch prototype loaded. Scheme records are fictional demo data."
);
