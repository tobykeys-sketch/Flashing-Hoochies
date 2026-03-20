// Fishing & Shellfishing regulations for Puget Sound Marine Areas 10 & 11
// Source: WDFW 2024-2025 Sport Fishing Rules
// Update this file at the start of each season or after emergency closures.
// Last updated: 2025-01-01

const REGULATIONS = {
  10: {
    name: 'Marine Area 10 — Seattle/Bremerton',
    officialUrl:          'https://wdfw.wa.gov/fishing/regulations/sport',
    eRegulationsUrl:      'https://www.eregulations.com/washington/fishing/marine-area-10',
    emergencyFishingUrl:  'https://wdfw.wa.gov/fishing/regulations/emergency-rules',
    emergencyShellUrl:    'https://wdfw.wa.gov/fishing/shellfish/recreational/rules',
    shellfishStatusUrl:   'https://wdfw.wa.gov/fishing/shellfish/crabs/dungeness/seasons',
    biotoxinUrl:          'https://wdfw.wa.gov/fishing/shellfish/recreationalBiotoxins',

    finfish: [
      {
        name: 'Chinook Salmon',
        status: 'check',
        openDates: 'Check current WDFW emergency rules — season varies',
        bagLimit: '2 hatchery Chinook per day',
        sizeLimit: '12 inches minimum',
        notes: 'Only marked (clipped adipose fin) fish may be retained. Verify current WDFW rules.',
      },
      {
        name: 'Coho Salmon',
        status: 'check',
        openDates: 'July–November typically; check current rules',
        bagLimit: '2 hatchery Coho per day',
        sizeLimit: 'No minimum size',
        notes: 'Only marked (clipped adipose fin) fish may be retained.',
      },
      {
        name: 'Pink Salmon (Humpy)',
        status: 'check',
        openDates: 'Odd years only — typically August–September; check current rules',
        bagLimit: '6 Pink salmon per day',
        sizeLimit: 'No minimum size',
        notes: 'Pink salmon run in odd-numbered years only. Check WDFW for current year openings.',
      },
    ],

    shellfish: [
      {
        name: 'Dungeness Crab',
        status: 'check',
        openDates: 'Check current WDFW season status — varies year to year',
        bagLimit: '5 male Dungeness per day',
        sizeLimit: '6.25 inch carapace minimum',
        notes: 'Males only. Check season status and any emergency closures before crabbing. Puget Sound seasons are distinct from coast.',
      },
      {
        name: 'Clams (Manila / Littleneck)',
        status: 'check',
        openDates: 'Year-round on approved beaches; verify biotoxin status',
        bagLimit: '40 clams per day',
        sizeLimit: 'No minimum size',
        notes: '⚠️ Always check biotoxin (PSP) status before harvesting. Closures can happen any time.',
      },
      {
        name: 'Oysters',
        status: 'check',
        openDates: 'Varies by beach — most in fall/winter; check WDFW',
        bagLimit: '18 oysters per day',
        sizeLimit: 'No minimum size',
        notes: 'Many beaches are private tidelands. Confirm public access and biotoxin status before harvesting.',
      },
      {
        name: 'Spot Shrimp',
        status: 'check',
        openDates: 'Spring season only — typically May; check current rules',
        bagLimit: '80 spot shrimp per day (pot gear)',
        sizeLimit: 'No minimum size',
        notes: 'Season is very short and popular. Check exact open/close dates each year.',
      },
    ],
  },

  11: {
    name: 'Marine Area 11 — Tacoma/Vashon Island',
    officialUrl:          'https://wdfw.wa.gov/fishing/regulations/sport',
    eRegulationsUrl:      'https://www.eregulations.com/washington/fishing/marine-area-11',
    emergencyFishingUrl:  'https://wdfw.wa.gov/fishing/regulations/emergency-rules',
    emergencyShellUrl:    'https://wdfw.wa.gov/fishing/shellfish/recreational/rules',
    shellfishStatusUrl:   'https://wdfw.wa.gov/fishing/shellfish/crabs/dungeness/seasons',
    biotoxinUrl:          'https://wdfw.wa.gov/fishing/shellfish/recreationalBiotoxins',

    finfish: [
      {
        name: 'Chinook Salmon',
        status: 'check',
        openDates: 'Check current WDFW emergency rules — season varies',
        bagLimit: '2 hatchery Chinook per day',
        sizeLimit: '12 inches minimum',
        notes: 'Only marked (clipped adipose fin) fish may be retained.',
      },
      {
        name: 'Coho Salmon',
        status: 'check',
        openDates: 'August–November typically; check current rules',
        bagLimit: '2 hatchery Coho per day',
        sizeLimit: 'No minimum size',
        notes: 'Only marked (clipped adipose fin) fish may be retained.',
      },
      {
        name: 'Pink Salmon (Humpy)',
        status: 'check',
        openDates: 'Odd years only — typically August–September; check current rules',
        bagLimit: '6 Pink salmon per day',
        sizeLimit: 'No minimum size',
        notes: 'Pink salmon run in odd-numbered years only. Check WDFW for current year openings.',
      },
    ],

    shellfish: [
      {
        name: 'Dungeness Crab',
        status: 'check',
        openDates: 'Check current WDFW season status — South Sound seasons may differ from Area 10',
        bagLimit: '5 male Dungeness per day',
        sizeLimit: '6.25 inch carapace minimum',
        notes: 'Males only. South Sound crab seasons and areas are managed separately — verify before going out.',
      },
      {
        name: 'Clams (Manila / Littleneck)',
        status: 'check',
        openDates: 'Year-round on approved beaches; verify biotoxin status',
        bagLimit: '40 clams per day',
        sizeLimit: 'No minimum size',
        notes: '⚠️ Always check biotoxin (PSP) status before harvesting. Closures can happen any time.',
      },
      {
        name: 'Oysters',
        status: 'check',
        openDates: 'Varies by beach — check WDFW for approved harvest sites',
        bagLimit: '18 oysters per day',
        sizeLimit: 'No minimum size',
        notes: 'Confirm public beach access and check biotoxin status before harvesting.',
      },
      {
        name: 'Spot Shrimp',
        status: 'check',
        openDates: 'Spring season only — typically May; check current rules',
        bagLimit: '80 spot shrimp per day (pot gear)',
        sizeLimit: 'No minimum size',
        notes: 'South Sound shrimp seasons vary — check WDFW for exact Area 11 dates.',
      },
    ],
  },
};

const LAST_UPDATED = '2025-01-01';

function getRegulations(areaNum) {
  return REGULATIONS[areaNum] || null;
}

function getAllRegulations() {
  return { areas: REGULATIONS, lastUpdated: LAST_UPDATED };
}

module.exports = { getRegulations, getAllRegulations };
