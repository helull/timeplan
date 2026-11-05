export function hasStudent() {

    return (
        localStorage.getItem(
            "studentName"
        ) &&
        localStorage.getItem(
            "classId"
        )
    );
}

export function getStudent() {

    return {

        name:
            localStorage.getItem(
                "studentName"
            ),

        classId:
            localStorage.getItem(
                "classId"
            )
    };
}
