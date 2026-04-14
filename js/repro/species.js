const SPECIES_DATA = {
    human: {
        label: '🧍 Human', color: '#60a5fa',
        cycleLength: 14, periodLength: 3, ovulationDay: 7,
        fertileStart: 5, fertileEnd: 8,
        pregnancySpeed: 4.5,
        postpartumDays: 5,
        heatCycle: false, dragonClutch: false, bloodMoon: false,
        info: 'Standard 14-day accelerated cycle. Pregnancy 40 weeks at 4.5× speed.'
    },
    elf: {
        label: '🌿 Elf', color: '#4ade80',
        cycleLength: 90, periodLength: 5, ovulationDay: 45,
        fertileStart: 40, fertileEnd: 50,
        pregnancySpeed: 0.5,
        postpartumDays: 3,
        heatCycle: false, dragonClutch: false, bloodMoon: false,
        info: '90-day cycle. Very hard to conceive — low fertile window. Pregnancy ~80 virtual days (2× slower). Twin births are considered divine.'
    },
    demi: {
        label: '🐾 Demi-Human / Beastkin', color: '#fb923c',
        cycleLength: 21, periodLength: 2, ovulationDay: 10,
        fertileStart: 8, fertileEnd: 12,
        pregnancySpeed: 4,
        postpartumDays: 4,
        heatCycle: true, heatIntervalDays: 90, heatDurationDays: 3,
        dragonClutch: false, bloodMoon: false,
        info: '21-day cycle. Every ~90 virtual days a "Heat" triggers — 3 days of extreme fertility spike. Pregnancy 5× faster than human.'
    },
    demon: {
        label: '😈 Demon / Succubus', color: '#f87171',
        cycleLength: 14, periodLength: 1, ovulationDay: 7,
        fertileStart: 1, fertileEnd: 14,
        pregnancySpeed: 6,
        postpartumDays: 2,
        heatCycle: false, dragonClutch: false, bloodMoon: false,
        info: 'Always fertile — no safe days. Pregnancy extremely fast (~7 virtual days to 40 weeks). Short postpartum recovery.'
    },
    vampire: {
        label: '🦇 Vampire', color: '#c084fc',
        cycleLength: 30, periodLength: 0, ovulationDay: 15,
        fertileStart: 14, fertileEnd: 16,
        pregnancySpeed: 2,
        postpartumDays: 7,
        heatCycle: false, dragonClutch: false, bloodMoon: true, bloodMoonIntervalDays: 30,
        info: 'Conception ONLY possible during Blood Moon window (once per 30 days). No menstruation. Pregnancy 2× faster than human.'
    },
    fae: {
        label: '🍃 Fae / Fairy', color: '#34d399',
        cycleLength: 28, periodLength: 3, ovulationDay: 14,
        fertileStart: 10, fertileEnd: 16,
        pregnancySpeed: 2.5,
        postpartumDays: 4,
        heatCycle: false, dragonClutch: false, bloodMoon: false, seasonal: true,
        info: 'Cycle follows seasons — spring & autumn boost fertility (2× fertilityScore). Pregnancy ~2.5× faster. Glamour conceals belly until week 20.'
    },
    dragon: {
        label: '🐉 Dragon', color: '#fbbf24',
        cycleLength: 0, periodLength: 0, ovulationDay: 0,
        fertileStart: 0, fertileEnd: 0,
        pregnancySpeed: 2,
        postpartumDays: 0,
        heatCycle: false, dragonClutch: true, clutchSize: [2, 4], incubationDays: 90,
        bloodMoon: false,
        info: 'No menstrual cycle. Lays a clutch of 2-4 eggs. Incubation: ~90 virtual days. No postpartum — egg-laying is a brief intense event.'
    },
    custom: {
        label: '⚙️ Custom', color: '#94a3b8',
        cycleLength: 14, periodLength: 3, ovulationDay: 7,
        fertileStart: 5, fertileEnd: 8,
        pregnancySpeed: 3,
        postpartumDays: 5,
        heatCycle: false, dragonClutch: false, bloodMoon: false,
        info: 'Custom species — same as human defaults. Edit bio/personality to describe the species lore.'
    }
};

function getSpeciesData(bot) {
    const key = bot.species || 'human';
    return SPECIES_DATA[key] || SPECIES_DATA.human;
}

function initCycleDataForSpecies(bot) {
    if (bot.cycleData) return;
    const sp = getSpeciesData(bot);
    const cl = sp.cycleLength || CYCLE_LENGTH;
    const randomCycleDay = cl > 0 ? Math.floor(Math.random() * cl) : 0;
    bot.cycleData = {
        lastPeriodStartDay: -(randomCycleDay),
        cycleLength: cl,
        periodLength: sp.periodLength,
        ovulationDay: sp.ovulationDay,
        fertileStart: sp.fertileStart,
        fertileEnd: sp.fertileEnd,
        pregnant: false,
        conceptionVirtualDay: null,
        intercourseEvents: [],
        laborStarted: false,
        laborVirtualDay: null,
        birthVirtualDay: null,
        postpartumStartDay: null,
        pregnancyTestTaken: false,
        pregnancyTestDay: null,
        fetusCount: sp.dragonClutch ? (sp.clutchSize[0] + Math.floor(Math.random() * (sp.clutchSize[1] - sp.clutchSize[0] + 1))) : 1,
        fetuses: [{ gender: 'unknown', nickname: '' }],
        children: [],
        eventLog: [],
        lastHeatDay: null,
        inHeat: false,
        lastBloodMoonDay: null
    };
    saveBots();
}
