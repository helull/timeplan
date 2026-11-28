import {
    auth
}
from "./firebase.js";

import {
    isSignInWithEmailLink,
    signInWithEmailLink
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    teacherExists
}
from "./teacherService.js";

import {
    loginTeacher
}
from "./teacher.js";

export async function
finishMagicLogin() {

    if (
        !isSignInWithEmailLink(
            auth,
            window.location.href
        )
    ) {
        return;
    }

    const email =
        localStorage.getItem(
            "emailForSignIn"
        );

    if (!email) {
        return;
    }

    await signInWithEmailLink(
        auth,
        email,
        window.location.href
    );

    const exists =
        await teacherExists(
            email
        );

    if (!exists) {

        alert(
            "Ikke registrert lærer"
        );

        return;
    }

    loginTeacher(
        email
    );

    window.history.replaceState(
        {},
        document.title,
        "/"
    );

    location.reload();
}
