export const Action = { Left: 1, Right: 2, Up: 4, Down: 8, Jump: 16, Act: 32 } as const;
export const ACTION_MASK = 63;

export const pressed = (input: number, prev: number, bit: number) => (input & bit) !== 0 && (prev & bit) === 0;
