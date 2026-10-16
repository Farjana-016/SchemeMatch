/* ==========================================================================
   SchemeMatch — Explainable Eligibility Matching Engine
   Team Impact X | INNOHACKS 2.0

   All scheme records in this prototype are fictional demonstration data.
   They are NOT verified government schemes and do not establish legal eligibility.
   ========================================================================== */

let schemes = [];
let schemesLoaded = false;
let schemeLoadError = "";
let currentResults = [];
let lastEvaluatedProfile = null;

/* --------------------------------------------------------------------------
   1. HTML ELEMENT REFERENCES
   -------------------------------------------------------------------------- */
const schemeForm = document.getElementById("scheme-form");
const ageInput = document.getElementById("age");
const stateInput = document.getElementById("state");
const incomeInput = document.getElementById("income");
const occupationInput = document.getElementById("occupation");
const studentStatusGroup = document.getElementById("student-status-group");
const studentStatusInput = document.getElementById("student-status");
const additionalDetailsInput = document.getElementById("additional-details");
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

/* --------------------------------------------------------------------------
   2. NORMALIZATION & VALIDATION HELPERS (PHASE 3.2)
   -------------------------------------------------------------------------- */
const VALID_INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
    "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const STATE_ALIASES = {
    "orissa": "Odisha",
    "pondicherry": "Puducherry",
    "pondichery": "Puducherry",
    "jammu & kashmir": "Jammu and Kashmir",
    "j&k": "Jammu and Kashmir",
    "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
    "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
    "dadra & nagar haveli and daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
    "nct of delhi": "Delhi",
    "national capital territory of delhi": "Delhi",
    "uttaranchal": "Uttarakhand"
};

const VALID_OCCUPATION_OPTIONS = [
    "student", "farmer", "working", "self-employed", "unemployed", "homemaker", "other"
];

const OCCUPATION_ALIASES = {
    "employed": "working",
    "salaried": "working",
    "jobseeker": "unemployed",
    "business": "self-employed",
    "artisan": "self-employed",
    "agriculturalist": "farmer",
    "agriculture": "farmer"
};

const VALID_STUDENT_STATUSES = [
    "school", "college", "vocational", "other"
];

function normalizeState(input) {
    if (typeof input !== "string") return null;
    const trimmed = input.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();

    if (STATE_ALIASES[lower]) {
        return STATE_ALIASES[lower];
    }

    const found = VALID_INDIAN_STATES.find(function (s) {
        return s.toLowerCase() === lower;
    });

    return found || null;
}

function normalizeOccupation(input) {
    if (typeof input !== "string") return null;
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return null;

    if (OCCUPATION_ALIASES[trimmed]) {
        return OCCUPATION_ALIASES[trimmed];
    }

    if (VALID_OCCUPATION_OPTIONS.includes(trimmed)) {
        return trimmed;
    }

    return null;
}

function parseAge(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === "number") {
        if (!Number.isFinite(val) || !Number.isInteger(val) || val < 1 || val > 120) return null;
        return val;
    }
    const str = String(val).trim();
    if (!/^\d+$/.test(str)) return null;
    const num = parseInt(str, 10);
    if (isNaN(num) || num < 1 || num > 120) return null;
    return num;
}

function parseIncome(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === "number") {
        if (!Number.isFinite(val) || val < 0) return null;
        return val;
    }
    const str = String(val).trim();
    if (str === "") return null;
    const num = Number(str);
    if (!Number.isFinite(num) || num < 0 || isNaN(num)) return null;
    return num;
}

function showFormError(message) {
    if (!formError) return;
    formError.textContent = message;
    formError.hidden = message === "";
}

function clearFormErrors() {
    showFormError("");
    [ageInput, stateInput, occupationInput, incomeInput, studentStatusInput].forEach(function (el) {
        if (el) el.removeAttribute("aria-invalid");
    });
}

function updateStudentField() {
    if (!occupationInput || !studentStatusGroup) return;

    if (occupationInput.value === "student") {
        studentStatusGroup.hidden = false;
        if (studentStatusInput) {
            studentStatusInput.required = true;
            studentStatusInput.setAttribute("aria-required", "true");
        }
    } else {
        studentStatusGroup.hidden = true;
        if (studentStatusInput) {
            studentStatusInput.value = "";
            studentStatusInput.required = false;
            studentStatusInput.removeAttribute("aria-required");
            studentStatusInput.removeAttribute("aria-invalid");
        }
    }
}

if (occupationInput) {
    occupationInput.addEventListener("change", updateStudentField);
}

// Clear individual validation highlights on input or change
[ageInput, stateInput, occupationInput, incomeInput, studentStatusInput].forEach(function (el) {
    if (el) {
        el.addEventListener("input", function () {
            el.removeAttribute("aria-invalid");
            if (formError && !formError.hidden) {
                showFormError("");
            }
        });
        el.addEventListener("change", function () {
            el.removeAttribute("aria-invalid");
            if (formError && !formError.hidden) {
                showFormError("");
            }
        });
    }
});

function readUserProfile() {
    if (!ageInput || !stateInput || !incomeInput || !occupationInput) {
        return { error: "Form inputs are missing from the page." };
    }

    const rawAge = ageInput.value.trim();
    const rawState = stateInput.value.trim();
    const rawIncome = incomeInput.value.trim();
    const rawOcc = occupationInput.value.trim();
    const rawStudentStatus = studentStatusInput ? studentStatusInput.value.trim() : "";
    const rawDetails = additionalDetailsInput ? additionalDetailsInput.value.trim() : "";

    // 1. Age validation: Sensible range 1 to 120, positive whole integer
    if (rawAge === "") {
        return {
            error: "Please enter a valid age between 1 and 120.",
            field: "age",
            element: ageInput
        };
    }

    const parsedAge = parseAge(rawAge);
    if (parsedAge === null) {
        return {
            error: "Please enter a valid age between 1 and 120 as a whole number.",
            field: "age",
            element: ageInput
        };
    }

    // 2. State validation: Must match one of the recognized states / UTs
    if (rawState === "") {
        return {
            error: "Please select your state or union territory.",
            field: "state",
            element: stateInput
        };
    }

    const normState = normalizeState(rawState);
    if (!normState) {
        return {
            error: "Please select a valid state or union territory from the options.",
            field: "state",
            element: stateInput
        };
    }

    // 3. Income validation: Non-negative number (>= 0)
    if (rawIncome === "") {
        return {
            error: "Please enter a valid annual family income.",
            field: "income",
            element: incomeInput
        };
    }

    const parsedIncome = parseIncome(rawIncome);
    if (parsedIncome === null) {
        return {
            error: "Please enter a valid annual family income (0 or greater).",
            field: "income",
            element: incomeInput
        };
    }

    // 4. Occupation validation: Must match one of the supported options
    if (rawOcc === "") {
        return {
            error: "Please select your occupation.",
            field: "occupation",
            element: occupationInput
        };
    }

    const normOcc = normalizeOccupation(rawOcc);
    if (!normOcc) {
        return {
            error: "Please select a valid occupation from the options.",
            field: "occupation",
            element: occupationInput
        };
    }

    // 5. Student Status conditional validation
    let validStudentStatus = "";
    if (normOcc === "student") {
        if (!rawStudentStatus) {
            return {
                error: "Please select your student status.",
                field: "student-status",
                element: studentStatusInput
            };
        }
        if (!VALID_STUDENT_STATUSES.includes(rawStudentStatus.toLowerCase())) {
            return {
                error: "Please select a valid student status from the options.",
                field: "student-status",
                element: studentStatusInput
            };
        }
        validStudentStatus = rawStudentStatus;
    } else {
        // Clear stale student status answers if switching to another occupation
        if (studentStatusInput) {
            studentStatusInput.value = "";
        }
        validStudentStatus = "";
    }

    const occupationForMatching = {
        student: "student",
        working: "employed",
        "self-employed": "self-employed",
        unemployed: "unemployed",
        farmer: "farmer",
        homemaker: "homemaker",
        other: "other"
    };

    const profile = {
        age: parsedAge,
        state: normState,
        income: parsedIncome,
        occupation: occupationForMatching[normOcc] || normOcc,
        selectedOccupation: normOcc,
        studentStatus: validStudentStatus,
        additionalDetails: rawDetails.slice(0, 500)
    };

    return { profile: profile };
}

/* --------------------------------------------------------------------------
   3. EXPLAINABLE ELIGIBILITY MATCHING ENGINE
   -------------------------------------------------------------------------- */

/**
 * Evaluates the Age criterion for a scheme.
 */
function evaluateAgeCriterion(scheme, profile) {
    const el = scheme && scheme.eligibility ? scheme.eligibility : {};
    const hasMin = Number.isFinite(el.minimumAge);
    const hasMax = Number.isFinite(el.maximumAge);

    const userAge = profile ? parseAge(profile.age) : null;
    const rawAge = profile && profile.age !== null && profile.age !== undefined && profile.age !== "" ? profile.age : null;

    if (!hasMin && !hasMax) {
        return {
            key: "age",
            name: "Age Requirement",
            status: "unknown",
            userValue: userAge !== null ? userAge + " years" : (rawAge !== null ? "Invalid (" + rawAge + ")" : "Not provided"),
            requirement: "Not specified in demo dataset",
            explanation: "This requirement is not specified in the demo dataset."
        };
    }

    const min = hasMin ? el.minimumAge : null;
    const max = hasMax ? el.maximumAge : null;
    const requirement = hasMin && hasMax
        ? min + " to " + max + " years"
        : hasMin
            ? "At least " + min + " years"
            : "Up to " + max + " years";

    if (userAge === null) {
        return {
            key: "age",
            name: "Age Requirement",
            status: "unknown",
            userValue: rawAge !== null ? "Invalid (" + rawAge + ")" : "Not provided",
            requirement: requirement,
            explanation: "Your answer is needed to assess this criterion."
        };
    }

    if (hasMin && hasMax) {
        if (userAge >= min && userAge <= max) {
            return {
                key: "age",
                name: "Age Requirement",
                status: "met",
                userValue: userAge + " years",
                requirement: requirement,
                explanation: "Your age (" + userAge + " years) satisfies the required age range of " + min + " to " + max + " years."
            };
        }
        if (userAge < min) {
            return {
                key: "age",
                name: "Age Requirement",
                status: "unmet",
                userValue: userAge + " years",
                requirement: requirement,
                explanation: "Your age (" + userAge + " years) is below the minimum required age of " + min + " years."
            };
        }
        return {
            key: "age",
            name: "Age Requirement",
            status: "unmet",
            userValue: userAge + " years",
            requirement: requirement,
            explanation: "Your age (" + userAge + " years) exceeds the maximum eligible age of " + max + " years."
        };
    }

    if (hasMin) {
        if (userAge >= min) {
            return {
                key: "age",
                name: "Age Requirement",
                status: "met",
                userValue: userAge + " years",
                requirement: requirement,
                explanation: "Your age (" + userAge + " years) meets the minimum requirement of at least " + min + " years."
            };
        }
        return {
            key: "age",
            name: "Age Requirement",
            status: "unmet",
            userValue: userAge + " years",
            requirement: requirement,
            explanation: "Your age (" + userAge + " years) is below the minimum required age of " + min + " years."
        };
    }

    // Only hasMax
    if (userAge <= max) {
        return {
            key: "age",
            name: "Age Requirement",
            status: "met",
            userValue: userAge + " years",
            requirement: requirement,
            explanation: "Your age (" + userAge + " years) is within the maximum limit of " + max + " years."
        };
    }
    return {
        key: "age",
        name: "Age Requirement",
        status: "unmet",
        userValue: userAge + " years",
        requirement: requirement,
        explanation: "Your age (" + userAge + " years) exceeds the maximum eligible age of " + max + " years."
    };
}

/**
 * Evaluates the Annual Family Income criterion for a scheme.
 */
function evaluateIncomeCriterion(scheme, profile) {
    const el = scheme && scheme.eligibility ? scheme.eligibility : {};
    const hasLimit = Number.isFinite(el.maximumAnnualFamilyIncome);

    const userIncome = profile ? parseIncome(profile.income) : null;
    const rawIncome = profile && profile.income !== null && profile.income !== undefined && profile.income !== "" ? profile.income : null;

    if (!hasLimit) {
        return {
            key: "income",
            name: "Annual Family Income",
            status: "unknown",
            userValue: userIncome !== null
                ? "₹" + userIncome.toLocaleString("en-IN") + " / year"
                : (rawIncome !== null ? "Invalid (" + rawIncome + ")" : "Not provided"),
            requirement: "Not specified in demo dataset",
            explanation: "This requirement is not specified in the demo dataset."
        };
    }

    const maxIncome = el.maximumAnnualFamilyIncome;
    const requirement = "Up to ₹" + maxIncome.toLocaleString("en-IN") + " / year";

    if (userIncome === null) {
        return {
            key: "income",
            name: "Annual Family Income",
            status: "unknown",
            userValue: rawIncome !== null ? "Invalid (₹" + rawIncome + ")" : "Not provided",
            requirement: requirement,
            explanation: "Your answer is needed to assess this criterion."
        };
    }

    if (userIncome <= maxIncome) {
        return {
            key: "income",
            name: "Annual Family Income",
            status: "met",
            userValue: "₹" + userIncome.toLocaleString("en-IN") + " / year",
            requirement: requirement,
            explanation: "Your annual family income (₹" + userIncome.toLocaleString("en-IN") + ") is within the maximum limit of ₹" + maxIncome.toLocaleString("en-IN") + "."
        };
    }

    return {
        key: "income",
        name: "Annual Family Income",
        status: "unmet",
        userValue: "₹" + userIncome.toLocaleString("en-IN") + " / year",
        requirement: requirement,
        explanation: "Your annual family income (₹" + userIncome.toLocaleString("en-IN") + ") exceeds the maximum limit of ₹" + maxIncome.toLocaleString("en-IN") + "."
    };
}

/**
 * Evaluates the State / Regional coverage criterion for a scheme.
 */
function evaluateStateCriterion(scheme, profile) {
    const el = scheme && scheme.eligibility ? scheme.eligibility : {};
    const rawStates = Array.isArray(el.states) ? el.states : [];
    const statesList = rawStates
        .filter(function (s) { return typeof s === "string" && s.trim().length > 0; })
        .map(function (s) { return s.trim(); });

    const rawUserState = profile && typeof profile.state === "string" ? profile.state.trim() : "";
    const userState = normalizeState(rawUserState);

    if (statesList.length === 0) {
        return {
            key: "state",
            name: "State / Regional Coverage",
            status: "unknown",
            userValue: userState || rawUserState || "Not provided",
            requirement: "Not specified in demo dataset",
            explanation: "This requirement is not specified in the demo dataset."
        };
    }

    const allIndia = statesList.some(function (s) {
        return s.toLowerCase() === "all india";
    });

    const requirement = allIndia ? "All India (Nationwide)" : "Restricted to: " + statesList.join(", ");

    if (!rawUserState) {
        return {
            key: "state",
            name: "State / Regional Coverage",
            status: "unknown",
            userValue: "Not provided",
            requirement: requirement,
            explanation: "Your answer is needed to assess this criterion."
        };
    }

    // Unexpected / unrecognized state
    if (!userState) {
        return {
            key: "state",
            name: "State / Regional Coverage",
            status: "unknown",
            userValue: rawUserState + " (Unrecognized)",
            requirement: requirement,
            explanation: "Declared state ('" + rawUserState + "') is not recognized as a valid Indian state or union territory. Verification required."
        };
    }

    if (allIndia) {
        return {
            key: "state",
            name: "State / Regional Coverage",
            status: "met",
            userValue: userState,
            requirement: "All India (Nationwide)",
            explanation: "This scheme applies nationwide across All India. Your state (" + userState + ") is covered."
        };
    }

    const isCovered = statesList.some(function (s) {
        return s.toLowerCase() === userState.toLowerCase();
    });

    if (isCovered) {
        return {
            key: "state",
            name: "State / Regional Coverage",
            status: "met",
            userValue: userState,
            requirement: "Restricted to: " + statesList.join(", "),
            explanation: "Your state (" + userState + ") is included in the covered states list (" + statesList.join(", ") + ")."
        };
    }

    return {
        key: "state",
        name: "State / Regional Coverage",
        status: "unmet",
        userValue: userState,
        requirement: "Restricted to: " + statesList.join(", "),
        explanation: "This scheme is only available in: " + statesList.join(", ") + ". Your declared state (" + userState + ") is outside the coverage area."
    };
}

/**
 * Evaluates the Occupation criterion for a scheme.
 */
function evaluateOccupationCriterion(scheme, profile) {
    const el = scheme && scheme.eligibility ? scheme.eligibility : {};
    const rawOccupations = Array.isArray(el.occupation) ? el.occupation : [];
    const allowed = rawOccupations
        .filter(function (o) { return typeof o === "string" && o.trim().length > 0; })
        .map(function (o) { return o.trim().toLowerCase(); });

    const rawUserOcc = profile ? (profile.selectedOccupation || profile.occupation || "") : "";
    const selected = typeof rawUserOcc === "string" ? rawUserOcc.trim() : "";

    if (allowed.length === 0) {
        return {
            key: "occupation",
            name: "Occupation Requirement",
            status: "unknown",
            userValue: rawUserOcc || "Not provided",
            requirement: "Not specified in demo dataset",
            explanation: "This requirement is not specified in the demo dataset."
        };
    }

    const requirement = allowed.join(", ");

    if (!selected) {
        return {
            key: "occupation",
            name: "Occupation Requirement",
            status: "unknown",
            userValue: "Not provided",
            requirement: "Required: " + requirement,
            explanation: "Your answer is needed to assess this criterion."
        };
    }

    const normKey = normalizeOccupation(selected);

    // If occupation is not recognized as a supported option
    if (!normKey) {
        const isStudentOnly = allowed.length === 1 && allowed[0] === "student";
        const isEmployedOnly = allowed.length === 1 && allowed[0] === "employed";

        if (isStudentOnly) {
            return {
                key: "occupation",
                name: "Occupation Requirement",
                status: "unmet",
                userValue: selected,
                requirement: "Required: " + requirement,
                explanation: "This scheme is strictly restricted to students (" + requirement + "). Declared occupation (" + selected + ") is not eligible."
            };
        }

        if (isEmployedOnly) {
            return {
                key: "occupation",
                name: "Occupation Requirement",
                status: "unmet",
                userValue: selected,
                requirement: "Required: " + requirement,
                explanation: "This scheme requires salaried employment (" + requirement + "). Declared occupation (" + selected + ") does not meet this requirement."
            };
        }

        return {
            key: "occupation",
            name: "Occupation Requirement",
            status: "unknown",
            userValue: selected + " (Unrecognized)",
            requirement: "Required: " + requirement,
            explanation: "This scheme specifies: " + requirement + ". Declared occupation ('" + selected + "') is not recognized as a supported occupation category. Verification is needed to determine eligibility."
        };
    }

    // Determine normalized occupation key and user-facing display label
    let displayValue = selected;
    let evalKey = normKey;

    if (normKey === "student") {
        displayValue = "Student" + (profile && profile.studentStatus ? " (" + profile.studentStatus + ")" : "");
    } else if (normKey === "working") {
        evalKey = "employed";
        displayValue = "Working professional (Employed)";
    } else if (normKey === "self-employed") {
        displayValue = "Self-employed / Artisan";
    } else if (normKey === "unemployed") {
        displayValue = "Unemployed / Seeking work";
    } else if (normKey === "farmer") {
        displayValue = "Farmer / Agriculturalist";
    } else if (normKey === "homemaker") {
        displayValue = "Homemaker";
    } else if (normKey === "other") {
        displayValue = "Other";
    }

    // 1. Direct match check
    if (allowed.includes(evalKey) || allowed.includes(normKey)) {
        return {
            key: "occupation",
            name: "Occupation Requirement",
            status: "met",
            userValue: displayValue,
            requirement: "Required: " + requirement,
            explanation: "Your declared occupation (" + displayValue + ") matches the required occupation (" + requirement + ")."
        };
    }

    // 2. Direct conflicts for standard mutually-exclusive dataset categories
    if (normKey === "student") {
        return {
            key: "occupation",
            name: "Occupation Requirement",
            status: "unmet",
            userValue: displayValue,
            requirement: "Required: " + requirement,
            explanation: "This scheme is restricted to: " + requirement + ". Your declared occupation is Student."
        };
    }

    if (normKey === "working") {
        return {
            key: "occupation",
            name: "Occupation Requirement",
            status: "unmet",
            userValue: displayValue,
            requirement: "Required: " + requirement,
            explanation: "This scheme is restricted to: " + requirement + ". Salaried employment is not eligible under stated criteria."
        };
    }

    if (normKey === "self-employed") {
        return {
            key: "occupation",
            name: "Occupation Requirement",
            status: "unmet",
            userValue: displayValue,
            requirement: "Required: " + requirement,
            explanation: "This scheme is restricted to: " + requirement + ". Self-employed applicants are not eligible under stated criteria."
        };
    }

    if (normKey === "unemployed") {
        return {
            key: "occupation",
            name: "Occupation Requirement",
            status: "unmet",
            userValue: displayValue,
            requirement: "Required: " + requirement,
            explanation: "This scheme is restricted to: " + requirement + ". Unemployed applicants are not eligible under stated criteria."
        };
    }

    // 3. Unlisted occupations in dataset (Farmer, Homemaker, Other)
    // IMPORTANT: Do NOT assume farmer == self-employed without explicit documented rule.
    // If scheme is strictly restricted to students or salaried employees, it is unmet.
    const isStudentOnly = allowed.length === 1 && allowed[0] === "student";
    const isEmployedOnly = allowed.length === 1 && allowed[0] === "employed";

    if (isStudentOnly) {
        return {
            key: "occupation",
            name: "Occupation Requirement",
            status: "unmet",
            userValue: displayValue,
            requirement: "Required: " + requirement,
            explanation: "This scheme is strictly restricted to students (" + requirement + "). Declared occupation (" + displayValue + ") is not eligible."
        };
    }

    if (isEmployedOnly) {
        return {
            key: "occupation",
            name: "Occupation Requirement",
            status: "unmet",
            userValue: displayValue,
            requirement: "Required: " + requirement,
            explanation: "This scheme requires salaried employment (" + requirement + "). Declared occupation (" + displayValue + ") does not meet this requirement."
        };
    }

    // For other schemes (e.g., self-employed, unemployed, or multiple categories),
    // because Farmer / Homemaker / Other is not explicitly listed in the dataset,
    // equivalence cannot be assumed and verification is required.
    return {
        key: "occupation",
        name: "Occupation Requirement",
        status: "unknown",
        userValue: displayValue,
        requirement: "Required: " + requirement,
        explanation: "This scheme specifies: " + requirement + ". Declared occupation ('" + displayValue + "') is not explicitly listed in the dataset, and equivalence cannot be assumed without official guidelines. Verification is needed to determine eligibility."
    };
}

/**
 * Master evaluation function. Single source of truth.
 * Evaluates every explicitly supported eligibility criterion and classifies each as:
 * - 'met'
 * - 'unmet'
 * - 'unknown'
 */
function evaluateScheme(scheme, profile) {
    profile = profile || {};

    const criteria = [
        evaluateAgeCriterion(scheme, profile),
        evaluateIncomeCriterion(scheme, profile),
        evaluateStateCriterion(scheme, profile),
        evaluateOccupationCriterion(scheme, profile)
    ];

    const matched = criteria.filter(function (c) { return c.status === "met"; });
    const unmet = criteria.filter(function (c) { return c.status === "unmet"; });
    const unknown = criteria.filter(function (c) { return c.status === "unknown"; });

    // Strict Matching Rules:
    // 1. Never treat missing information as a match.
    // 2. Never treat an unknown criterion as unmet.
    // 3. A scheme is a potential match IF AND ONLY IF there are ZERO unmet criteria AND at least one met criterion.
    // 4. If all criteria are unknown, it has insufficient information.
    const hasConflict = unmet.length > 0;
    const hasInsufficientInfo = (matched.length === 0 && unmet.length === 0);
    const potentialMatch = !hasConflict && !hasInsufficientInfo;
    const allMet = (unmet.length === 0 && unknown.length === 0 && matched.length > 0);

    return {
        scheme: scheme,
        profile: profile,
        criteria: criteria,
        matched: matched,
        unmet: unmet,
        unknown: unknown,
        potentialMatch: potentialMatch,
        hasConflict: hasConflict,
        hasInsufficientInfo: hasInsufficientInfo,
        allMet: allMet,
        confidence: allMet ? "high" : potentialMatch ? "moderate" : "none"
    };
}

// Attach to window for automated testing and transparency
if (typeof window !== "undefined") {
    window.evaluateScheme = evaluateScheme;
    window.readUserProfile = readUserProfile;
    window.evaluateAgeCriterion = evaluateAgeCriterion;
    window.evaluateIncomeCriterion = evaluateIncomeCriterion;
    window.evaluateStateCriterion = evaluateStateCriterion;
    window.evaluateOccupationCriterion = evaluateOccupationCriterion;
    window.parseAge = parseAge;
    window.parseIncome = parseIncome;
    window.normalizeState = normalizeState;
    window.normalizeOccupation = normalizeOccupation;
}

/* --------------------------------------------------------------------------
   4. FORMAT SAMPLE BENEFITS & TEXT UTILITIES
   -------------------------------------------------------------------------- */
function getBenefitSummary(benefit) {
    benefit = benefit || {};
    const summary = benefit.description || "Benefit details need verification.";

    if (Number.isFinite(benefit.amountINR)) {
        return summary + " (sample amount: ₹" +
            benefit.amountINR.toLocaleString("en-IN") + ")";
    }

    return summary;
}

function escapeHtml(text) {
    if (typeof text !== "string") return String(text || "");
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function capitalize(str) {
    if (typeof str !== "string" || !str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* --------------------------------------------------------------------------
   5. RENDER SCHEME CARDS (STITCH DASHBOARD SCREEN C)
   -------------------------------------------------------------------------- */
function getCategoryIcon(cat) {
    switch ((cat || "").toLowerCase()) {
        case "education":
            return "school";
        case "rural":
        case "agriculture":
            return "agriculture";
        case "health":
            return "health_and_safety";
        case "employment":
            return "work";
        case "women":
            return "female";
        case "general":
            return "account_balance";
        default:
            return "policy";
    }
}

function createSchemeCard(result) {
    const scheme = result.scheme;
    const totalCriteria = result.matched.length + result.unmet.length + result.unknown.length;

    const card = document.createElement("article");
    card.className = "scheme-card";

    // 1. Header: Category badge & Defensible match status indicator
    const header = document.createElement("div");
    header.className = "scheme-card-header";

    const category = document.createElement("span");
    category.className = "scheme-category scheme-category-badge";
    const catIcon = getCategoryIcon(scheme.category);
    category.innerHTML = '<span class="material-symbols-outlined category-icon" aria-hidden="true">' + catIcon + '</span><span>' + escapeHtml(capitalize(scheme.category)) + '</span>';

    const matchBadge = document.createElement("span");
    if (result.hasConflict) {
        matchBadge.className = "scheme-match-badge scheme-badge-conflict";
        matchBadge.innerHTML = '<span class="material-symbols-outlined match-badge-icon" aria-hidden="true">cancel</span><span>' + result.unmet.length + ' Criteria Conflict</span>';
    } else if (result.allMet) {
        matchBadge.className = "scheme-match-badge scheme-badge-matched";
        matchBadge.innerHTML = '<span class="material-symbols-outlined match-badge-icon" aria-hidden="true">check_circle</span><span>All ' + result.matched.length + '/' + totalCriteria + ' Criteria Met</span>';
    } else {
        matchBadge.className = "scheme-match-badge scheme-badge-potential";
        matchBadge.innerHTML = '<span class="material-symbols-outlined match-badge-icon" aria-hidden="true">task_alt</span><span>' + result.matched.length + '/' + totalCriteria + ' Criteria Met</span>';
    }

    header.appendChild(category);
    header.appendChild(matchBadge);

    // 2. Body: Title and Description
    const body = document.createElement("div");
    body.className = "scheme-card-body";

    const title = document.createElement("h3");
    title.className = "scheme-card-title";
    title.textContent = scheme.name;

    const description = document.createElement("p");
    description.className = "scheme-card-description";
    description.textContent = scheme.description;

    body.appendChild(title);
    body.appendChild(description);

    // 3. Key Benefit Ribbon (Stitch screen C)
    const benefit = document.createElement("div");
    benefit.className = "scheme-benefit scheme-benefit-box";
    const benefitVal = getBenefitSummary(scheme.benefit);
    benefit.innerHTML = '<div class="scheme-benefit-icon-wrap" aria-hidden="true">' +
        '<span class="material-symbols-outlined">payments</span>' +
        '</div>' +
        '<div class="scheme-benefit-content">' +
        '<span class="scheme-benefit-label">Sample Indicative Benefit</span>' +
        '<span class="scheme-benefit-value">' + escapeHtml(benefitVal) + '</span>' +
        '</div>';

    // 4. Status Banner
    const status = document.createElement("p");
    status.className = "scheme-status scheme-status-match";

    if (result.hasConflict) {
        status.className = "scheme-status scheme-status-demo";
        status.textContent = "Definite criteria conflict (" + result.unmet.length + " unmet). Not eligible on stated rules.";
    } else if (result.hasInsufficientInfo) {
        status.className = "scheme-status scheme-status-demo";
        status.textContent = "Insufficient criteria specified in dataset records. Verification required.";
    } else if (result.allMet) {
        status.textContent = "All " + result.matched.length + " stated criteria satisfied in demo records (Preliminary match).";
    } else {
        status.textContent = "Potential match: " + result.matched.length + " criteria satisfied, " + result.unknown.length + " need verification.";
    }

    // 5. Criteria Verification Matrix Section
    const criteriaSection = document.createElement("div");
    criteriaSection.className = "scheme-criteria-section";

    const matrixTitle = document.createElement("span");
    matrixTitle.className = "criteria-matrix-title";
    matrixTitle.textContent = "Criteria Verification Matrix (" + result.matched.length + "/" + totalCriteria + " satisfied):";

    const matrix = document.createElement("div");
    matrix.className = "scheme-criteria-matrix";

    result.criteria.forEach(function (c) {
        const chip = document.createElement("span");
        chip.className = "criteria-chip criteria-chip-" + c.status;
        const icon = c.status === "met" ? "✓" : c.status === "unmet" ? "✕" : "•";
        chip.textContent = icon + " " + c.name + ": " + (c.status === "met" ? "Satisfied" : c.status === "unmet" ? "Unmet" : "Unverified");
        matrix.appendChild(chip);
    });

    criteriaSection.appendChild(matrixTitle);
    criteriaSection.appendChild(matrix);

    // 6. Stats Row
    const statsRow = document.createElement("div");
    statsRow.className = "scheme-stats-row";

    const matchedText = document.createElement("p");
    matchedText.className = "scheme-stat scheme-stat-matched";
    matchedText.textContent = "Criteria matched: " + result.matched.length;

    const unknownText = document.createElement("p");
    unknownText.className = "scheme-stat scheme-stat-unknown";
    unknownText.textContent = "Criteria needing verification: " + result.unknown.length;

    statsRow.appendChild(matchedText);
    statsRow.appendChild(unknownText);

    // 7. Demo Disclaimer Notice
    const demoNotice = document.createElement("p");
    demoNotice.className = "scheme-status scheme-status-demo";
    demoNotice.textContent = "Fictional demonstration scheme — does not confirm official government eligibility.";

    // 8. Action Button
    const detailsButton = document.createElement("button");
    detailsButton.type = "button";
    detailsButton.className = "button button-secondary";
    detailsButton.innerHTML = '<span>View eligibility details</span><span class="material-symbols-outlined btn-icon" aria-hidden="true">arrow_forward</span>';

    detailsButton.addEventListener("click", function () {
        showSchemeDetails(result);
    });

    [
        header,
        body,
        benefit,
        status,
        criteriaSection,
        statsRow,
        demoNotice,
        detailsButton
    ].forEach(function (element) {
        card.appendChild(element);
    });

    return card;
}

/* --------------------------------------------------------------------------
   6. RENDER RESULTS VIEW (STITCH AGGREGATE METRICS & PROFILE CHIPS)
   -------------------------------------------------------------------------- */
function renderResults() {
    if (!schemeResults || !categoryFilter || !noResults || !resultsSummary) {
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

    const totalEvaluated = schemes.length || 30;
    resultsSummary.textContent =
        filteredResults.length +
        " potential demo match(es) found across 30 evaluated schemes. These examples are fictional " +
        "and do not confirm legal eligibility.";

    // Update aggregate metric cards (truthful, derived solely from evaluated data)
    const metricTotalEvaluated = document.getElementById("metric-total-evaluated");
    const metricPotentialMatches = document.getElementById("metric-potential-matches");
    const metricPotentialSub = document.getElementById("metric-potential-sub");
    const metricNeedsVerification = document.getElementById("metric-needs-verification");
    const metricVerificationSub = document.getElementById("metric-verification-sub");

    if (metricTotalEvaluated) {
        metricTotalEvaluated.textContent = totalEvaluated + " Schemes";
    }

    const verificationSchemesCount = filteredResults.filter(function (r) {
        return r.unknown.length > 0;
    }).length;

    if (metricPotentialMatches) {
        metricPotentialMatches.textContent = filteredResults.length +
            (filteredResults.length === 1 ? " Potential Match" : " Potential Matches");
    }
    if (metricPotentialSub) {
        metricPotentialSub.textContent = selectedCategory === "all"
            ? "Criteria satisfied in demo"
            : "In " + capitalize(selectedCategory) + " category";
    }

    if (metricNeedsVerification) {
        metricNeedsVerification.textContent = verificationSchemesCount + " To Verify";
    }
    if (metricVerificationSub) {
        metricVerificationSub.textContent = verificationSchemesCount === 1
            ? "1 scheme with pending checks"
            : verificationSchemesCount + " schemes with pending checks";
    }

    // Update active citizen profile chips (Stitch screen C)
    const profileChipsContainer = document.getElementById("results-profile-chips");
    if (profileChipsContainer && lastEvaluatedProfile) {
        profileChipsContainer.replaceChildren();

        const label = document.createElement("span");
        label.className = "profile-chips-label";
        label.textContent = "Evaluated against active profile:";
        profileChipsContainer.appendChild(label);

        const chips = [];
        if (lastEvaluatedProfile.age) {
            chips.push(lastEvaluatedProfile.age + " yrs");
        }
        if (lastEvaluatedProfile.state) {
            chips.push(lastEvaluatedProfile.state);
        }
        if (lastEvaluatedProfile.selectedOccupation) {
            chips.push(capitalize(lastEvaluatedProfile.selectedOccupation));
        }
        if (Number.isFinite(lastEvaluatedProfile.income)) {
            chips.push("Income ≤ ₹" + lastEvaluatedProfile.income.toLocaleString("en-IN"));
        }

        chips.forEach(function (chipText, idx) {
            if (idx > 0) {
                const dot = document.createElement("span");
                dot.className = "profile-chip-dot";
                dot.textContent = "•";
                dot.setAttribute("aria-hidden", "true");
                profileChipsContainer.appendChild(dot);
            }
            const chip = document.createElement("span");
            chip.className = "profile-chip";
            chip.textContent = chipText;
            profileChipsContainer.appendChild(chip);
        });
    }

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

/* --------------------------------------------------------------------------
   7. DETAILED ELIGIBILITY DOSSIER & GAP PANEL (STITCH DOSSIER SCREEN D)
   -------------------------------------------------------------------------- */
function showSchemeDetails(result) {
    if (!schemeDetails || !eligibilityPanel) return;

    const scheme = result.scheme;
    const profile = result.profile || lastEvaluatedProfile || {};
    const totalCriteria = result.matched.length + result.unmet.length + result.unknown.length;

    schemeDetails.replaceChildren();
    schemeDetails.hidden = false;

    // 1. Top action & navigation bar (Stitch screen D)
    const topBar = document.createElement("div");
    topBar.className = "dossier-top-bar";

    const topLeft = document.createElement("div");
    topLeft.className = "dossier-top-left";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "button button-outline dossier-back-btn";
    backButton.innerHTML = '<span class="material-symbols-outlined btn-icon" aria-hidden="true">arrow_back</span><span>Back to Scheme Results</span>';
    backButton.addEventListener("click", function () {
        if (schemeResults) {
            schemeResults.scrollIntoView({ behavior: "smooth", block: "start" });
            const firstBtn = schemeResults.querySelector(".scheme-card button");
            if (firstBtn) firstBtn.focus();
        }
    });

    const fileTag = document.createElement("span");
    fileTag.className = "dossier-file-tag";
    fileTag.textContent = "Scheme File #" + scheme.id;

    topLeft.appendChild(backButton);
    topLeft.appendChild(fileTag);

    const topRight = document.createElement("div");
    topRight.className = "dossier-top-right";

    const printButton = document.createElement("button");
    printButton.type = "button";
    printButton.className = "button button-outline dossier-print-btn";
    printButton.innerHTML = '<span class="material-symbols-outlined btn-icon" aria-hidden="true">print</span><span>Print Dossier</span>';
    printButton.addEventListener("click", function () {
        window.print();
    });

    topRight.appendChild(printButton);
    topBar.appendChild(topLeft);
    topBar.appendChild(topRight);
    schemeDetails.appendChild(topBar);

    // 2. Taxonomy badges
    const badgesRow = document.createElement("div");
    badgesRow.className = "dossier-badges-row";

    const catBadge = document.createElement("span");
    catBadge.className = "scheme-category-badge";
    const catIcon = getCategoryIcon(scheme.category);
    catBadge.innerHTML = '<span class="material-symbols-outlined category-icon" aria-hidden="true">' + catIcon + '</span><span>' + escapeHtml(capitalize(scheme.category)) + '</span>';

    const notice = document.createElement("p");
    notice.className = "scheme-details-notice";
    notice.textContent = "Fictional demo data — not an official government scheme.";

    const matchBadge = document.createElement("span");
    matchBadge.className = "scheme-match-badge " + (result.hasConflict ? "scheme-badge-conflict" : result.allMet ? "scheme-badge-matched" : "scheme-badge-potential");
    matchBadge.innerHTML = '<span class="material-symbols-outlined match-badge-icon" aria-hidden="true">' + (result.hasConflict ? 'cancel' : result.allMet ? 'check_circle' : 'task_alt') + '</span><span>' + result.matched.length + ' of ' + totalCriteria + ' Criteria Satisfied</span>';

    badgesRow.appendChild(catBadge);
    badgesRow.appendChild(notice);
    badgesRow.appendChild(matchBadge);
    schemeDetails.appendChild(badgesRow);

    // 3. Scheme Title & Authority Context
    const title = document.createElement("h3");
    title.className = "dossier-title";
    title.textContent = scheme.name;

    const authority = document.createElement("p");
    authority.className = "dossier-authority";
    authority.innerHTML = 'Administered under demonstration registry for <strong>' + escapeHtml(capitalize(scheme.category)) + '</strong> public welfare initiatives.';

    const desc = document.createElement("p");
    desc.className = "dossier-desc";
    desc.textContent = scheme.description;

    schemeDetails.appendChild(title);
    schemeDetails.appendChild(authority);
    schemeDetails.appendChild(desc);

    // 4. Benefit Highlight Box
    const benefit = document.createElement("div");
    benefit.className = "scheme-details-benefit dossier-benefit-box";
    const benefitContent = getBenefitSummary(scheme.benefit);
    benefit.innerHTML = '<div class="benefit-box-inner">' +
        '<div class="benefit-icon-circle" aria-hidden="true"><span class="material-symbols-outlined">payments</span></div>' +
        '<div>' +
        '<span class="benefit-tag">Sample Indicative Entitlement Projection</span>' +
        '<div class="benefit-main-val">Fictional sample benefit: ' + escapeHtml(benefitContent) + '</div>' +
        '<p class="benefit-disclaimer">Demonstration value only — actual disbursements and schedules are solely governed by official ministerial gazettes.</p>' +
        '</div>' +
        '</div>';
    schemeDetails.appendChild(benefit);

    // 5. Stated Rules Grid (4 Columns)
    const rulesGrid = document.createElement("div");
    rulesGrid.className = "dossier-rules-grid";

    const ageRangeStr = (scheme.eligibility && scheme.eligibility.minimumAge != null ? scheme.eligibility.minimumAge + " yrs" : "None") +
        " to " + (scheme.eligibility && scheme.eligibility.maximumAge != null ? scheme.eligibility.maximumAge + " yrs" : "None");
    const incomeStr = scheme.eligibility && scheme.eligibility.maximumAnnualFamilyIncome != null
        ? "Up to ₹" + scheme.eligibility.maximumAnnualFamilyIncome.toLocaleString("en-IN")
        : "Not specified";
    const occStr = scheme.eligibility && Array.isArray(scheme.eligibility.occupation) && scheme.eligibility.occupation.length > 0
        ? scheme.eligibility.occupation.map(capitalize).join(", ")
        : "Not specified in dataset";
    const statesStr = scheme.eligibility && Array.isArray(scheme.eligibility.states) && scheme.eligibility.states.length > 0
        ? scheme.eligibility.states.join(", ")
        : "Not specified in dataset";

    const ruleItems = [
        { label: "Age Requirement", val: ageRangeStr },
        { label: "Family Income Limit", val: incomeStr },
        { label: "Target Occupation", val: occStr },
        { label: "Geographic Coverage", val: statesStr }
    ];

    ruleItems.forEach(function (r) {
        const rCard = document.createElement("div");
        rCard.className = "dossier-rule-card";
        rCard.innerHTML = '<span class="dossier-rule-label">' + escapeHtml(r.label) + '</span><span class="dossier-rule-value">' + escapeHtml(r.val) + '</span>';
        rulesGrid.appendChild(rCard);
    });
    schemeDetails.appendChild(rulesGrid);

    // 6. Transparent Evaluation Explanation (preserving exact text for test assertions)
    const explanation = document.createElement("p");
    explanation.className = "scheme-details-explanation";
    explanation.textContent =
        "Transparent Criteria Evaluation: Evaluated against your profile (Age: " +
        (profile.age ? profile.age + " yrs" : "Not provided") + ", State: " +
        (profile.state || "Not provided") + ", Annual Income: " +
        (Number.isFinite(profile.income) ? "₹" + profile.income.toLocaleString("en-IN") : "Not provided") +
        ", Occupation: " + (profile.selectedOccupation || "Not provided") + "). " +
        "Stated criteria matched: " + result.matched.length + ", Unmet: " + result.unmet.length +
        ", Requiring verification: " + result.unknown.length +
        ". Important: A preliminary match against demo rules does not establish official government eligibility.";
    schemeDetails.appendChild(explanation);

    // 7. Documents section (truthful: only if present in data, else truthful fallback)
    const docsCard = document.createElement("div");
    docsCard.className = "dossier-docs-card";

    if (Array.isArray(scheme.documentsRequired) && scheme.documentsRequired.length > 0) {
        const docsHeader = document.createElement("p");
        docsHeader.className = "scheme-docs-header dossier-docs-title";
        docsHeader.innerHTML = '<span class="material-symbols-outlined text-secondary" aria-hidden="true">fact_check</span><span>Sample Documents Listed in Dataset (Demonstration only — verify with ministry portal):</span>';

        const docsList = document.createElement("ul");
        docsList.className = "scheme-docs-list dossier-docs-list";
        scheme.documentsRequired.forEach(function (doc) {
            const docItem = document.createElement("li");
            docItem.className = "dossier-doc-item";
            docItem.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">description</span><span>' + escapeHtml(doc) + '</span>';
            docsList.appendChild(docItem);
        });

        docsCard.appendChild(docsHeader);
        docsCard.appendChild(docsList);
    } else {
        const noDocsMsg = document.createElement("p");
        noDocsMsg.className = "scheme-docs-header dossier-docs-title";
        noDocsMsg.innerHTML = '<span class="material-symbols-outlined text-accent" aria-hidden="true">info</span><span>Document requirements are not specified for this scheme in the demonstration dataset.</span>';
        docsCard.appendChild(noDocsMsg);
    }
    schemeDetails.appendChild(docsCard);

    // 8. Official Application Routing Guidance (Truthful: no fake URLs!)
    const routingCard = document.createElement("div");
    routingCard.className = "dossier-routing-box";
    routingCard.innerHTML = '<span class="material-symbols-outlined routing-icon" aria-hidden="true">shield</span>' +
        '<div class="dossier-routing-text">' +
        '<strong>Official Ministry Routing &amp; Public Guidance:</strong> ' +
        'External application links are not included in this demonstration dataset. Do not submit sensitive identity documents, bank credentials, or OTPs on unverified portals. Citizens should verify current operational guidelines directly on official government platforms (e.g. <a href="https://www.myscheme.gov.in" target="_blank" rel="noopener noreferrer">myscheme.gov.in</a> or designated state department websites).' +
        '</div>';
    schemeDetails.appendChild(routingCard);

    // 9. Jump to Clause-by-Clause Gap Finder button
    const jumpWrap = document.createElement("div");
    jumpWrap.className = "dossier-jump-wrap";
    jumpWrap.innerHTML = '<a href="#eligibility-panel" class="button button-primary button-small">' +
        '<span>Review Clause-by-Clause Gap Finder</span>' +
        '<span class="material-symbols-outlined btn-icon" aria-hidden="true">arrow_downward</span>' +
        '</a>';
    schemeDetails.appendChild(jumpWrap);

    renderEligibilityAnalysis(result);

    schemeDetails.setAttribute("tabindex", "-1");
    schemeDetails.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
    schemeDetails.focus({ preventScroll: true });
}

function createListItem(criterionOrText) {
    const item = document.createElement("li");
    item.className = "eligibility-item";

    if (typeof criterionOrText === "string") {
        item.textContent = criterionOrText;
        item.classList.add("eligibility-item-placeholder");
        return item;
    }

    const titleWrap = document.createElement("div");
    titleWrap.className = "eligibility-item-header";

    const title = document.createElement("strong");
    title.textContent = criterionOrText.name;

    const statusPill = document.createElement("span");
    statusPill.className = "eligibility-status-pill eligibility-pill-" + criterionOrText.status;
    statusPill.textContent = criterionOrText.status === "met"
        ? "Satisfied"
        : criterionOrText.status === "unmet"
            ? "Unmet"
            : "Needs Verification";

    titleWrap.appendChild(title);
    titleWrap.appendChild(statusPill);

    const reqP = document.createElement("p");
    reqP.className = "eligibility-item-req";
    reqP.innerHTML = "<strong>Required:</strong> " + escapeHtml(criterionOrText.requirement);

    const userP = document.createElement("p");
    userP.className = "eligibility-item-user";
    userP.innerHTML = "<strong>Your input:</strong> " + escapeHtml(criterionOrText.userValue);

    const explP = document.createElement("p");
    explP.className = "eligibility-item-expl";
    explP.textContent = criterionOrText.explanation;

    item.appendChild(titleWrap);
    item.appendChild(reqP);
    item.appendChild(userP);
    item.appendChild(explP);

    return item;
}

function renderEligibilityAnalysis(result) {
    if (!matchedList || !unmetList || !unknownList || !eligibilityPanel) {
        return;
    }

    matchedList.replaceChildren();
    unmetList.replaceChildren();
    unknownList.replaceChildren();

    result.matched.forEach(function (c) {
        matchedList.appendChild(createListItem(c));
    });

    result.unmet.forEach(function (c) {
        unmetList.appendChild(createListItem(c));
    });

    result.unknown.forEach(function (c) {
        unknownList.appendChild(createListItem(c));
    });

    if (result.matched.length === 0) {
        matchedList.appendChild(createListItem("No criteria have been confirmed as matched."));
    }

    if (result.unmet.length === 0) {
        unmetList.appendChild(createListItem("No unmet criteria identified in this demo evaluation."));
    }

    if (result.unknown.length === 0) {
        unknownList.appendChild(createListItem("No unverified criteria in this demo evaluation."));
    }

    eligibilityPanel.hidden = false;
}

/* --------------------------------------------------------------------------
   8. FORM SUBMISSION HANDLER
   -------------------------------------------------------------------------- */
if (schemeForm) {
    schemeForm.addEventListener("submit", function (event) {
        event.preventDefault();
        clearFormErrors();

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
            if (formData.element) {
                formData.element.setAttribute("aria-invalid", "true");
                formData.element.focus();
            }
            return;
        }

        lastEvaluatedProfile = formData.profile;

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

/* --------------------------------------------------------------------------
   9. CATEGORY FILTER HANDLER
   -------------------------------------------------------------------------- */
if (categoryFilter) {
    categoryFilter.addEventListener("change", renderResults);
}

/* --------------------------------------------------------------------------
   10. EDIT ANSWERS & START AGAIN HANDLERS
   -------------------------------------------------------------------------- */
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

    clearFormErrors();

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

if (startAgainButton) {
    startAgainButton.addEventListener("click", function () {
        if (schemeForm) schemeForm.reset();

        clearFormErrors();
        currentResults = [];
        lastEvaluatedProfile = null;

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

/* --------------------------------------------------------------------------
   11. DATA INGESTION & CONVERSION
   -------------------------------------------------------------------------- */
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

    const eligibility = scheme.eligibility && typeof scheme.eligibility === "object"
        ? scheme.eligibility
        : {};

    const benefit = scheme.benefit && typeof scheme.benefit === "object"
        ? scheme.benefit
        : {};

    const documentsRequired = Array.isArray(scheme.documentsRequired)
        ? scheme.documentsRequired.filter(function (d) { return typeof d === "string"; })
        : [];

    return {
        id: scheme.id || "SCHEME-" + Math.random().toString(36).substr(2, 6),
        name: scheme.name,
        category: scheme.category,
        description: scheme.description,
        eligibility: {
            minimumAge: Number.isFinite(eligibility.minimumAge) ? eligibility.minimumAge : null,
            maximumAge: Number.isFinite(eligibility.maximumAge) ? eligibility.maximumAge : null,
            maximumAnnualFamilyIncome: Number.isFinite(eligibility.maximumAnnualFamilyIncome) ? eligibility.maximumAnnualFamilyIncome : null,
            occupation: Array.isArray(eligibility.occupation) ? eligibility.occupation : [],
            states: Array.isArray(eligibility.states) ? eligibility.states : []
        },
        criteria: [], // Backward-compatibility
        benefit: {
            description: typeof benefit.description === "string" ? benefit.description : "",
            amountINR: Number.isFinite(benefit.amountINR) ? benefit.amountINR : null,
            fictionalAmount: benefit.fictionalAmount === true
        },
        documentsRequired: documentsRequired,
        fictional: scheme.fictional === true,
        verificationStatus: scheme.verificationStatus || "fictional_demo"
    };
}

function updateCategoryOptions() {
    if (!categoryFilter) return;

    const selectedCategory = categoryFilter.value;
    const categories = Array.from(new Set(
        schemes.map(function (scheme) { return scheme.category; })
    )).sort();

    categoryFilter.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All categories";
    categoryFilter.appendChild(allOption);

    categories.forEach(function (category) {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categoryFilter.appendChild(option);
    });

    categoryFilter.value = categories.includes(selectedCategory)
        ? selectedCategory
        : "all";
}

const BACKEND_API_URL = "https://schemematch-1.onrender.com/api/schemes";

async function loadSchemesFromBackend() {
    if (submitButton) submitButton.disabled = true;

    try {
        console.log("Loading SchemeMatch demo schemes from backend API...");
        let response;
        try {
            response = await fetch(BACKEND_API_URL);
            if (!response.ok) {
                throw new Error("Backend API HTTP status: " + response.status);
            }
        } catch (apiError) {
            console.warn("Backend API unavailable, falling back to local schemes.json:", apiError);
            response = await fetch("./schemes.json");
            if (!response.ok) {
                throw new Error("Could not load schemes.json. HTTP status: " + response.status);
            }
        }

        const data = await response.json();
        const schemeRecords = Array.isArray(data)
            ? data
            : data && Array.isArray(data.schemes)
                ? data.schemes
                : null;

        if (!schemeRecords || schemeRecords.length === 0) {
            throw new Error("The scheme database does not contain any schemes.");
        }

        schemes = schemeRecords.map(convertBackendScheme);
        updateCategoryOptions();

        schemesLoaded = true;
        schemeLoadError = "";

        if (submitButton) submitButton.disabled = false;
        showFormError("");

        console.log("Successfully loaded " + schemes.length + " schemes.");
    } catch (error) {
        schemesLoaded = false;
        schemeLoadError = "Could not load schemes from server or local database.";
        showFormError(schemeLoadError);
        console.error("SchemeMatch data loading failed:", error);
    }
}

/* --------------------------------------------------------------------------
   12. MOBILE NAVIGATION DRAWER (ACCESSIBLE CIVIC DRAWER)
   -------------------------------------------------------------------------- */
const navToggle = document.getElementById("nav-toggle");
const navDrawer = document.getElementById("nav-drawer");
const navDrawerClose = document.getElementById("nav-drawer-close");
const navDrawerBackdrop = document.getElementById("nav-drawer-backdrop");

function openNavDrawer() {
    if (!navDrawer || !navToggle) return;
    navDrawer.hidden = false;
    navToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("drawer-open");
    if (navDrawerClose) {
        navDrawerClose.focus();
    }
}

function closeNavDrawer() {
    if (!navDrawer || !navToggle) return;
    navDrawer.hidden = true;
    navToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("drawer-open");
    navToggle.focus();
}

if (navToggle) {
    navToggle.addEventListener("click", function () {
        const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
        if (isExpanded) {
            closeNavDrawer();
        } else {
            openNavDrawer();
        }
    });
}

if (navDrawerClose) {
    navDrawerClose.addEventListener("click", closeNavDrawer);
}

if (navDrawerBackdrop) {
    navDrawerBackdrop.addEventListener("click", closeNavDrawer);
}

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && navDrawer && !navDrawer.hidden) {
        closeNavDrawer();
    }
});

const drawerLinks = document.querySelectorAll(".nav-drawer-links a, .drawer-cta");
drawerLinks.forEach(function (link) {
    link.addEventListener("click", function () {
        closeNavDrawer();
    });
});

/* --------------------------------------------------------------------------
   13. INITIALIZATION
   -------------------------------------------------------------------------- */
updateStudentField();
loadSchemesFromBackend();

console.log("SchemeMatch explainable matching prototype loaded. Fictional demo data.");
