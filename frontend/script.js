
/* =========================================
   SchemeMatch — Government Scheme Finder
   Team Impact X | INNOHACKS 2.0

   Prototype note:
   These are fictional demo records used to
   demonstrate the matching process. They are
   NOT verified government schemes.
========================================= */


/* 1. LOAD SCHEME DATA FROM THE BACKEND */

let schemes = [];
let schemesLoaded = false;
let schemeLoadError = "";


/* 2. GET HTML ELEMENTS */

const schemeForm = document.getElementById("scheme-form");

const ageInput = document.getElementById("age");
const stateInput = document.getElementById("state");
const incomeInput = document.getElementById("income");
const occupationInput = document.getElementById("occupation");

const studentStatusGroup =
    document.getElementById("student-status-group");

const studentStatusInput =
    document.getElementById("student-status");

const formError = document.getElementById("form-error");
const submitButton = schemeForm
    ? schemeForm.querySelector('button[type="submit"]')
    : null;

const resultsSection = document.getElementById("results");
const resultsSummary = document.getElementById("results-summary");
const categoryFilter = document.getElementById("category-filter");
const schemeResults = document.getElementById("scheme-results");
const noResults = document.getElementById("no-results");

const editAnswersButton =
    document.getElementById("edit-answers-button");

const schemeDetails = document.getElementById("scheme-details");

const eligibilityPanel =
    document.getElementById("eligibility-panel");

const matchedList = document.getElementById("matched-list");
const unmetList = document.getElementById("unmet-list");
const unknownList = document.getElementById("unknown-list");

const startAgainButton =
    document.getElementById("start-again-button");


/* 3. STORE THE LATEST RESULTS */

let currentResults = [];

function showFormError(message) {
    if (!formError) {
        return;
    }

    formError.textContent = message;
    formError.hidden = message === "";
}


/* 4. SHOW OR HIDE THE STUDENT QUESTION */

function updateStudentField() {
    if (!occupationInput || !studentStatusGroup) {
        return;
    }

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
    updateStudentField();
}


/* 5. READ AND VALIDATE THE USER'S ANSWERS */

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
        return {
            error: "Please enter a valid age between 1 and 120."
        };
    }

    if (!profile.state) {
        return {
            error: "Please select your state or union territory."
        };
    }

    if (
        incomeInput.value.trim() === "" ||
        !Number.isFinite(income) ||
        income < 0
    ) {
        return {
            error: "Please enter a valid annual family income."
        };
    }

    if (!profile.selectedOccupation) {
        return {
            error: "Please select your occupation."
        };
    }

    if (
        profile.selectedOccupation === "student" &&
        !profile.studentStatus
    ) {
        return {
            error: "Please select your student status."
        };
    }

    return {
        profile: profile
    };
}


/* 6. CHECK ONE ELIGIBILITY CRITERION

   Returns one of three values:
   "match"   = criterion is satisfied
   "unmet"   = criterion is not satisfied
   "unknown" = criterion cannot be confirmed
*/

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

        if (
            userValue >= criterion.min &&
            userValue <= criterion.max
        ) {
            return "match";
        }

        return "unmet";
    }

    if (criterion.type === "equals") {
        if (criterion.value === undefined) {
            return "unknown";
        }

        if (userValue === criterion.value) {
            return "match";
        }

        return "unmet";
    }

    if (criterion.type === "max") {
        if (
            !Number.isFinite(userValue) ||
            !Number.isFinite(criterion.value)
        ) {
            return "unknown";
        }

        if (userValue <= criterion.value) {
            return "match";
        }

        return "unmet";
    }

    if (criterion.type === "min") {
        if (
            !Number.isFinite(userValue) ||
            !Number.isFinite(criterion.value)
        ) {
            return "unknown";
        }

        if (userValue >= criterion.value) {
            return "match";
        }

        return "unmet";
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

    // An unsupported criterion must not be treated as a match.
    return "unknown";
}


/* 7. CHECK ALL CRITERIA FOR ONE SCHEME */

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

    /*
       Only show a scheme as a potential match when no
       listed criterion is unmet.

       Unknown criteria are NOT proof of eligibility.
    */

    result.potentialMatch = result.unmet.length === 0;

    return result;
}


/* 8. CREATE A SCHEME RESULT CARD */

function getBenefitSummary(benefit) {
    const summary = benefit.description || "Benefit details need verification.";

    if (Number.isFinite(benefit.amountINR)) {
        return summary +
            " (sample amount: ₹" +
            benefit.amountINR.toLocaleString("en-IN") +
            ")";
    }

    return summary;
}

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
    benefit.textContent = "Sample benefit: " +
        getBenefitSummary(scheme.benefit);

    const demoNotice = document.createElement("p");
    demoNotice.className = "scheme-status";
    demoNotice.textContent =
        "Demo example — not a verified government scheme.";

    const status = document.createElement("p");
    status.className = "scheme-status";

    if (result.unknown.length > 0) {
        status.textContent =
            "Potential match: some eligibility criteria need verification.";
    } else {
        status.textContent =
            "Demo criteria matched. This does not confirm real-world eligibility.";
    }

    const matchedText = document.createElement("p");
    matchedText.textContent =
        "Criteria matched: " + result.matched.length;

    const unknownText = document.createElement("p");
    unknownText.textContent =
        "Criteria needing verification: " + result.unknown.length;

    const detailsButton = document.createElement("button");
    detailsButton.type = "button";
    detailsButton.className = "button button-secondary";
    detailsButton.textContent = "View eligibility details";

    detailsButton.addEventListener("click", function () {
        showSchemeDetails(result);
    });

    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(category);
    card.appendChild(benefit);
    card.appendChild(demoNotice);
    card.appendChild(status);
    card.appendChild(matchedText);
    card.appendChild(unknownText);
    card.appendChild(detailsButton);

    return card;
}


/* 9. RENDER THE RESULTS */

function renderResults() {
    schemeResults.replaceChildren();

    const selectedCategory = categoryFilter.value;

    const filteredResults = currentResults.filter(function (result) {
        if (selectedCategory === "all") {
            return true;
        }

        return result.scheme.category === selectedCategory;
    });

    if (filteredResults.length === 0) {
        noResults.hidden = false;
        noResults.textContent =
            "No potential matches were found in this demo dataset. " +
            "Try changing your answers or category filter.";
    } else {
        noResults.hidden = true;

        filteredResults.forEach(function (result) {
            schemeResults.appendChild(createSchemeCard(result));
        });
    }

    resultsSummary.textContent =
        filteredResults.length +
        " potential demo match(es) found. " +
        "These examples are fictional and do not confirm eligibility.";

    schemeDetails.hidden = true;
    eligibilityPanel.hidden = true;
}


/* 10. SHOW DETAILS FOR A SELECTED SCHEME */

function showSchemeDetails(result) {
    const scheme = result.scheme;

    schemeDetails.replaceChildren();
    schemeDetails.hidden = false;

    const title = document.createElement("h3");
    title.textContent = scheme.name;

    const notice = document.createElement("p");
    notice.textContent =
        "This is fictional demo data, not an official government scheme.";

    const explanation = document.createElement("p");
    explanation.textContent =
        "Review the following criteria classifications. " +
        "A match against demo criteria does not establish actual eligibility.";

    schemeDetails.appendChild(title);
    schemeDetails.appendChild(notice);
    schemeDetails.appendChild(explanation);

    const benefit = document.createElement("p");
    benefit.textContent = "Fictional sample benefit: " +
        getBenefitSummary(scheme.benefit);
    schemeDetails.appendChild(benefit);

    renderEligibilityAnalysis(result);

    schemeDetails.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* 11. CREATE A LIST ITEM SAFELY */

function createListItem(text) {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
}


/* 12. SHOW MATCHED, UNMET AND UNKNOWN CRITERIA */

function renderEligibilityAnalysis(result) {
    matchedList.replaceChildren();
    unmetList.replaceChildren();
    unknownList.replaceChildren();

    result.matched.forEach(function (item) {
        matchedList.appendChild(
            createListItem(item.label)
        );
    });

    // Corrected: no unnecessary matchedListItem assignment.
    result.unmet.forEach(function (item) {
        unmetList.appendChild(
            createListItem(item.label)
        );
    });

    result.unknown.forEach(function (item) {
        unknownList.appendChild(
            createListItem(item.label)
        );
    });

    if (result.matched.length === 0) {
        matchedList.appendChild(
            createListItem("No criteria have been confirmed as matched.")
        );
    }

    if (result.unmet.length === 0) {
        unmetList.appendChild(
            createListItem("No unmet criteria identified in this demo.")
        );
    }

    if (result.unknown.length === 0) {
        unknownList.appendChild(
            createListItem("No unknown criteria in this demo record.")
        );
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

        const profile = formData.profile;

        currentResults = schemes
            .map(function (scheme) {
                return evaluateScheme(scheme, profile);
            })
            .filter(function (result) {
                return result.potentialMatch;
            });

        categoryFilter.value = "all";

        renderResults();

        resultsSection.hidden = false;

        resultsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });
}


/* 14. HANDLE CATEGORY FILTER CHANGES */

if (categoryFilter) {
    categoryFilter.addEventListener("change", renderResults);
}


/* 15. LET THE USER EDIT THEIR ANSWERS */

if (editAnswersButton) {
    editAnswersButton.addEventListener("click", function () {
        resultsSection.hidden = true;

        const formSection = document.getElementById("find-schemes");

        if (formSection) {
            formSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });
}


/* 16. START AGAIN */

if (startAgainButton) {
    startAgainButton.addEventListener("click", function () {
        schemeForm.reset();

        showFormError("");

        currentResults = [];

        categoryFilter.value = "all";

        schemeResults.replaceChildren();
        schemeDetails.replaceChildren();

        resultsSection.hidden = true;
        schemeDetails.hidden = true;
        eligibilityPanel.hidden = true;

        updateStudentField();

        const formSection = document.getElementById("find-schemes");

        if (formSection) {
            formSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });
}


/* 17. INITIAL SETUP */

updateStudentField();

console.log(
    "SchemeMatch prototype loaded. " +
    "The current scheme records are fictional demo data."
);
// ============================================
// 18. CONNECT TO THE SCHEMEMATCH BACKEND
// ============================================

function convertBackendScheme(scheme) {
    if (
        !scheme ||
        typeof scheme !== "object" ||
        typeof scheme.name !== "string" ||
        typeof scheme.category !== "string" ||
        typeof scheme.description !== "string"
    ) {
        throw new Error("A scheme record is missing its name, category, or description.");
    }

    const eligibility = scheme.eligibility &&
        typeof scheme.eligibility === "object"
        ? scheme.eligibility
        : {};
    const criteria = [];
    const hasAgeRange =
        Number.isFinite(eligibility.minimumAge) &&
        Number.isFinite(eligibility.maximumAge);

    if (hasAgeRange) {
        criteria.push({
            key: "age",
            type: "range",
            min: eligibility.minimumAge,
            max: eligibility.maximumAge,
            label: "Age must be between " +
                eligibility.minimumAge +
                " and " +
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

    const backendBenefit = scheme.benefit &&
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
            description: typeof backendBenefit.description === "string"
                ? backendBenefit.description
                : "",
            amountINR: Number.isFinite(backendBenefit.amountINR)
                ? backendBenefit.amountINR
                : null,
            fictionalAmount: backendBenefit.fictionalAmount === true
        },
        fictional: scheme.fictional === true,
        verified: false
    };
}

function updateCategoryOptions() {
    const selectedCategory = categoryFilter.value;
    const categories = Array.from(new Set(schemes.map(function (scheme) {
        return scheme.category;
    }))).sort();

    categoryFilter.replaceChildren();

    const allCategoriesOption = document.createElement("option");
    allCategoriesOption.value = "all";
    allCategoriesOption.textContent = "All categories";
    categoryFilter.appendChild(allCategoriesOption);

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

async function loadSchemesFromBackend() {
    if (submitButton) {
        submitButton.disabled = true;
    }

    try {
        console.log("Connecting to the SchemeMatch backend...");

        const response = await fetch(
            "http://127.0.0.1:5000/api/schemes"
        );

        if (!response.ok) {
            throw new Error("Could not load schemes from the backend.");
        }

        const data = await response.json();

        if (
            !data ||
            !Array.isArray(data.schemes) ||
            data.schemes.length === 0
        ) {
            throw new Error(
                "The API response does not contain a non-empty schemes list."
            );
        }

        schemes = data.schemes.map(convertBackendScheme);
        updateCategoryOptions();
        schemesLoaded = true;
        schemeLoadError = "";

        if (submitButton) {
            submitButton.disabled = false;
        }

        showFormError("");

        console.log(
            "SchemeMatch backend connected successfully. Loaded " +
            schemes.length +
            " fictional demo schemes."
        );

    } catch (error) {
        schemeLoadError =
            "Could not load demo schemes. Make sure Flask is running at " +
            "http://127.0.0.1:5000, then refresh this page.";
        showFormError(schemeLoadError);

        console.error(
            "SchemeMatch backend connection failed. Check Flask and " +
            "http://127.0.0.1:5000/api/schemes.",
            error
        );
    }
}

// Prevent submissions until the backend records have replaced the old data.
loadSchemesFromBackend();