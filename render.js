export function renderSchedule(schedule) {
console.log(
    "Render uke",
    currentWeek
);
    const weeks =
        document.querySelectorAll(
            ".week"
        );

    weeks.forEach(week => {

        const weekNo =
            week.dataset.week;

        const days =
            week.querySelectorAll(
                ".day"
            );

        days.forEach(
            (day,index) => {

                const weekday =
                    index + 1;

                const dayName = [

                    "Mandag",
                    "Tirsdag",
                    "Onsdag",
                    "Torsdag",
                    "Fredag"

                ][index];

                const lessons =

                    schedule.lessons
                        .filter(

                            lesson =>

                                lesson.weekday ===
                                weekday

                        )
                        .sort(

                            (a,b) =>

                                a.start.localeCompare(
                                    b.start
                                )

                        );

                day.innerHTML = `

                    <div class="header">

                        <h1>

                            ${dayName}

                        </h1>

                        <div
                            class="week-number">

                            UKE ${weekNo}

                        </div>

                    </div>

                `;

                lessons.forEach(
                    lesson => {

                        day.innerHTML += `

                            <div
                                class="lesson ${lesson.color}">

                                <div
                                    class="subject">

                                    ${lesson.subject}

                                </div>

                                <div
                                    class="time">

                                    ${lesson.start}
                                    -
                                    ${lesson.end}

                                </div>

                            </div>

                        `;
                    }
                );
            }
        );
    });
}

export function renderHomework(homework) {

    document
        .querySelectorAll(
            ".homework-card"
        )
        .forEach(
            card => card.remove()
        );

    homework.forEach(item => {

        const selector =

            `.week[data-week="${item.week}"]
             .day[data-day="${item.weekday}"]`;

        const day =
            document.querySelector(
                selector
            );

        if (!day) return;

        const card =
            document.createElement(
                "div"
            );

        card.className =

            "lesson social homework-card";

        card.innerHTML = `

            <div
                class="subject">

                📝 ${item.title}

            </div>

            <div
                class="homework">

                ${item.description}

            </div>

        `;

        day.appendChild(card);
    });
}
