import {
    getAuth,
    sendSignInLinkToEmail
}
from "firebase/auth";

const auth =
    getAuth();

export async function
sendMagicLink(email)
{
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
