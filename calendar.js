export function getCurrentSchoolPosition() {

    const today =
        new Date();

    const weekday =
        today.getDay();

    let schoolDay = 0;

    let targetDate =
        new Date(today);

    if (
        weekday >= 1 &&
        weekday <= 5
    ) {

        schoolDay =
            weekday - 1;

    } else {

        // Lørdag eller søndag:
        // finn neste mandag

        const daysUntilMonday =

            weekday === 6
                ? 2
                : 1;

        targetDate.setDate(
            targetDate.getDate() +
            daysUntilMonday
        );
    }

    return {

        week:
            getWeekNumber(
                targetDate
            ),

        day:
            schoolDay
    };
}
function getWeekNumber(date) {

    const target =
        new Date(date.valueOf());

    const dayNr =
        (date.getDay() + 6) % 7;

    target.setDate(
        target.getDate() -
        dayNr + 3
    );

    const firstThursday =
        target.valueOf();

    target.setMonth(
        0,
        1
    );

    if (
        target.getDay() !== 4
    ) {

        target.setMonth(
            0,
            1 + (
                (
                    4 -
                    target.getDay()
                ) + 7
            ) % 7
        );
    }

    return (
        1 +
        Math.ceil(
            (
                firstThursday -
                target
            ) /
            604800000
        )
    );
}
