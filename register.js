export function showRegister() {

    document.body.insertAdjacentHTML(

        "beforeend",

        `

        <div
            class="register-screen"
            id="registerScreen">

            <div
                class="register-card">

                <h2>
                    Velkommen
                </h2>

                <input
                    id="nameInput"
                    placeholder="Navn">

                <button
                    id="startButton">

                    Fortsett

                </button>

            </div>

        </div>

        `

    );

    const button =
    document.getElementById(
        "startButton"
    );

button.addEventListener(
    "click",
    () => {

        const name =
            document
            .getElementById(
                "nameInput"
            )
            .value
            .trim();

        if (!name) {

            alert(
                "Skriv inn navn"
            );

            return;
        }

        localStorage.setItem(
            "studentName",
            name
        );

        localStorage.setItem(
            "classId",
            "TEST"
        );

        location.reload();

    }
);
}
