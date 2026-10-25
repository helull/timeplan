export function generateWeeks(
    centerWeek
){

    const container =
        document.querySelector(
            ".weeks"
        );

    container.innerHTML = "";

    const weekNumbers = [

        centerWeek - 1,
        centerWeek,
        centerWeek + 1

    ];

    weekNumbers.forEach(
        (weekNo,index) => {

            const section =
                document.createElement(
                    "section"
                );

            section.className =
                index === 1
                ? "week active"
                : "week";

            section.dataset.week =
                weekNo;

            section.innerHTML = `

                <div class="days">

                    <article
                        class="day"
                        data-day="1"></article>

                    <article
                        class="day"
                        data-day="2"></article>

                    <article
                        class="day"
                        data-day="3"></article>

                    <article
                        class="day"
                        data-day="4"></article>

                    <article
                        class="day"
                        data-day="5"></article>

                </div>

            `;

            container.appendChild(
                section
            );
        }
    );
}
