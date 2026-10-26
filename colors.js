const subjectColors = [
    "color-1",
    "color-2",
    "color-3",
    "color-4",
    "color-5",
    "color-6",
    "color-7",
    "color-8",
    "color-9",
    "color-10"
];

export function getSubjectColor(
    subject
) {

    let hash = 0;

    for (
        let i = 0;
        i < subject.length;
        i++
    ) {

        hash +=
            subject.charCodeAt(i);

    }

    return subjectColors[
        hash %
        subjectColors.length
    ];

}
