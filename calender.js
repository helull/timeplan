export function getCurrentSchoolPosition() {

    const today =
        new Date();

    const weekday =
        today.getDay();

    let schoolDay;

    if (weekday >= 1 && weekday <= 5) {

        schoolDay =
            weekday - 1;

    } else {

        schoolDay = 0;
    }

    return {

        week:
            getWeekNumber(today),

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
