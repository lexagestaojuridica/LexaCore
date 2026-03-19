import { parseISO } from "date-fns";
import { Evento } from "../types";

// Helper to calculate overlapping groups
export function calculateEventCollisions(events: Evento[]) {
    const sorted = [...events].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const groups: Evento[][][] = [];
    let currentGroup: Evento[][] = [];
    let groupEnd = new Date(0);

    sorted.forEach(evt => {
        const start = parseISO(evt.start_time);
        const end = parseISO(evt.end_time);

        if (start >= groupEnd) {
            if (currentGroup.length > 0) groups.push(currentGroup);
            currentGroup = [[evt]];
            groupEnd = end;
        } else {
            let placed = false;
            for (let i = 0; i < currentGroup.length; i++) {
                const lastEvtInCol = currentGroup[i][currentGroup[i].length - 1];
                if (start >= parseISO(lastEvtInCol.end_time)) {
                    currentGroup[i].push(evt);
                    placed = true;
                    break;
                }
            }

            if (!placed) {
                currentGroup.push([evt]);
            }

            if (end > groupEnd) {
                groupEnd = end;
            }
        }
    });

    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }

    const positionedEvents = new Map<string, { width: number; left: number }>();

    groups.forEach(group => {
        const columnsCount = group.length;
        const widthPercentage = 100 / columnsCount;

        group.forEach((column, colIndex) => {
            column.forEach(evt => {
                positionedEvents.set(evt.id, {
                    width: widthPercentage,
                    left: colIndex * widthPercentage
                });
            });
        });
    });

    return positionedEvents;
}
