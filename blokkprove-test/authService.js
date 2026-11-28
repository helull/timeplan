import {
    auth
}
from "./firebase.js";

import {
    sendSignInLinkToEmail
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const actionCodeSettings = {
    url: "https://helull.github.io/timeplan/",
    handleCodeInApp: true
};

export async function sendMagicLink(
    email
) {

    const actionCodeSettings = {

        url:
            window.location.origin,

        handleCodeInApp:
            true

    };

    await sendSignInLinkToEmail(

        auth,

        email,

        actionCodeSettings

    );

    localStorage.setItem(

        "emailForSignIn",

        email

    );
}
