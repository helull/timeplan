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
}
