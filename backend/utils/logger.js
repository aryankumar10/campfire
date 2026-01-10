// Simple colored logger (no external deps)
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',

    fg: {
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
    },
    bg: {
        black: '\x1b[40m',
        red: '\x1b[41m',
        green: '\x1b[42m',
        yellow: '\x1b[43m',
        blue: '\x1b[44m',
        magenta: '\x1b[45m',
        cyan: '\x1b[46m',
        white: '\x1b[47m',
    },
};

function timestamp() {
    return new Date().toISOString();
}

const logger = {
    info: (...args) => console.log(`${colors.fg.blue}[INFO ${timestamp()}]${colors.reset}`, ...args),
    success: (...args) => console.log(`${colors.fg.green}[OK   ${timestamp()}]${colors.reset}`, ...args),
    warn: (...args) => console.warn(`${colors.fg.yellow}[WARN ${timestamp()}]${colors.reset}`, ...args),
    error: (...args) => console.error(`${colors.fg.red}[ERR  ${timestamp()}]${colors.reset}`, ...args),
    debug: (...args) => console.debug(`${colors.fg.magenta}[DBG  ${timestamp()}]${colors.reset}`, ...args),
    room: (...args) => console.log(`${colors.fg.cyan}[ROOM ${timestamp()}]${colors.reset}`, ...args),
};

export default logger;
