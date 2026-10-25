export function renderSchedule(schedule) {

    const weekElements =
        document.querySelectorAll(".week");

    weekElements.forEach(
        week => {

        const weekNo =
            week.dataset.week;

        const days =
            week.querySelectorAll(".day");

        const names = [

            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday"
        ];

        days.forEach(
            (day,index) => {

            const weekday =
                names[index];

            const lessons =
                schedule?.[weekNo]
                ?.[weekday] || [];

            const dayName = [
                "Mandag",
                "Tirsdag",
                "Onsdag",
                "Torsdag",
                "Fredag"
            ][index];

            day.innerHTML = `

                <div class="header">

                    <h1>${dayName}</h1>

                    <div class="week-number">
                        UKE ${weekNo}
                    </div>

                </div>

            `;

            lessons.forEach(
                lesson => {

                day.innerHTML += `

                    <div class="lesson ${lesson.color}">

                        <div class="subject">
                            ${lesson.subject}
                        </div>

                        <div class="time">
                            ${lesson.start}
                            -
                            ${lesson.end}
                        </div>

                    </div>

                `;
            });

        });

    });

}

export function renderHomework(items){

    document
        .querySelectorAll(
            ".homework-card"
        )
        .forEach(
            x=>x.remove()
        );

    items.forEach(item=>{

        const selector =

            `.week[data-week="${item.week}"]
             .day[data-day="${item.weekday}"]`;

        const day =
            document.querySelector(
                selector
            );

        if(!day) return;

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "lesson social homework-card";

        card.innerHTML = `

            <div class="subject">
                📝 ${item.title}
            </div>

            <div class="homework">
                ${item.description}
            </div>

        `;

        day.appendChild(card);

    });

}
