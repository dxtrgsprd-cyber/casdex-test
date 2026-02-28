// ===================================================================
// Shared Access Control Compliance Rules, Power Specs, and Door Types
// Used by: Door Builder, Compliance Auditor, Mantrap Designer, Design Module
// ===================================================================

// ===== Types =====

export interface WireSpec {
  type: string;
  gauge: string;
  conductors: string;
}

export interface BuildResult {
  state: string;
  doorType: string;
  electrical: {
    controllerDraw: number;
    lockDraw: number;
    totalDraw: number;
    minPsu: number;
  };
  wiringSchedule: { component: string; spec: WireSpec }[];
  violations: { code: string; message: string }[];
  recommendations: string[];
}

export interface HardwareSet {
  controllerBrand: string;
  controllerModel: string;
  lockType: string;
  hasRex: boolean;
  rexType: string;
  hasDps: boolean;
  hasCloser: boolean;
}

export interface ComplianceViolation {
  code: string;
  message: string;
  severity: 'violation' | 'warning' | 'info';
}

export interface AuditResult {
  doorType: string;
  state: string;
  hardware: HardwareSet;
  violations: ComplianceViolation[];
  recommendations: string[];
  passCount: number;
  failCount: number;
}

export interface DoorConfig {
  id?: string;
  doorLabel: string;
  doorType: string;
  state: string;
  controllerBrand: string;
  controllerModel: string;
  lockBrand: string;
  lockModel: string;
  lockType: string;
  hasRex: boolean;
  rexType: string;
  hasDps: boolean;
  hasCloser: boolean;
  hasAdo: boolean;
  isMantrap: boolean;
  area?: string;
  floor?: string;
  room?: string;
  notes?: string;
}

// ===== State Jurisdiction Database =====

export interface StateJurisdiction {
  label: string;
  code: string;
  authority: string;
  adoptedCodes: string[];
  maglockRequiresPirRex: boolean;
  maglockRequiresPneumaticPte: boolean;
  fireRatedFailSafeRequired: boolean;
  fireRatedCloserRequired: boolean;
  facpTieInRequired: boolean;
  stairwellReIlluminationRequired: boolean;
  panicHardwareOnEgressDoors: boolean;
  additionalNotes: string[];
}

export const STATE_JURISDICTIONS: Record<string, StateJurisdiction> = {
  // ===== SOUTHEAST STATES =====
  'Louisiana (LASFM/NFPA 101)': {
    label: 'Louisiana (LASFM/NFPA 101)',
    code: 'LASFM',
    authority: 'Louisiana State Fire Marshal',
    adoptedCodes: ['NFPA 101', 'NFPA 80', 'IBC 2021'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: true,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'LASFM: Maglocks require PIR REX plus pneumatic push-to-exit per Louisiana State Fire Marshal amendments.',
      'LASFM: Mantrap interlocks must drop all locks on fire alarm activation.',
      'LASFM: Fail-Safe hardware required on all fire-rated doors with FACP tie-in.',
    ],
  },
  'Texas (TFC/NFPA 101)': {
    label: 'Texas (TFC/NFPA 101)',
    code: 'TFC',
    authority: 'Texas State Fire Marshal / Texas Fire Code',
    adoptedCodes: ['NFPA 101', 'NFPA 80', 'IFC 2021'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'TFC: Texas Fire Code adopts IFC 2021 with state amendments.',
      'TFC: Electromagnetic locks on egress doors require sensor-release hardware per TFC 1010.1.9.9.',
      'TFC: Fire watch required during fire alarm system impairment.',
    ],
  },
  'Alabama (ASFM/IFC)': {
    label: 'Alabama (ASFM/IFC)',
    code: 'ASFM-AL',
    authority: 'Alabama State Fire Marshal',
    adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 101 (referenced)', 'NFPA 80'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'ASFM-AL: Alabama adopts IFC/IBC 2021 with state amendments (Code of Alabama Title 34).',
      'ASFM-AL: Electromagnetic locks require listed sensor-release per IFC 1010.1.9.9.',
      'ASFM-AL: Local AHJ may impose additional requirements.',
    ],
  },
  'Arkansas (ASFM-AR/IFC)': {
    label: 'Arkansas (ASFM-AR/IFC)',
    code: 'ASFM-AR',
    authority: 'Arkansas State Fire Marshal',
    adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: false,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'ASFM-AR: Arkansas adopts IFC/IBC 2021 (ACA 12-29).',
      'ASFM-AR: Electromagnetic locks require sensor release per IFC 1010.1.9.9.',
    ],
  },
  'Florida (FSFM/FFC)': {
    label: 'Florida (FSFM/FFC)',
    code: 'FSFM',
    authority: 'Florida State Fire Marshal / Florida Fire Prevention Code',
    adoptedCodes: ['FFC (based on NFPA 1)', 'NFPA 101', 'NFPA 80', 'FBC (Florida Building Code)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: true,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'FSFM: Florida adopts NFPA 1 (Fire Prevention Code) as the Florida Fire Prevention Code with state amendments.',
      'FSFM: Electromagnetic locks require PIR REX plus pneumatic push-to-exit on means of egress (FFC 10.2).',
      'FSFM: High-rise buildings (75+ ft) require additional access control monitoring per FBC.',
      'FSFM: Hurricane-rated doors may have additional hardware constraints -- verify wind load rating.',
    ],
  },
  'Georgia (GSFM/IFC)': {
    label: 'Georgia (GSFM/IFC)',
    code: 'GSFM',
    authority: 'Georgia State Fire Marshal / Insurance and Safety Fire Commissioner',
    adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 101 (referenced)', 'NFPA 80'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'GSFM: Georgia adopts IFC/IBC 2021 through the Safety Fire Commissioner (OCGA 25-2).',
      'GSFM: Electromagnetic locks require listed sensor-release per IFC 1010.1.9.9.',
      'GSFM: Special occupancy rules for educational (K-12) and healthcare facilities.',
    ],
  },
  'Kentucky (KSFM/IFC)': {
    label: 'Kentucky (KSFM/IFC)',
    code: 'KSFM',
    authority: 'Kentucky State Fire Marshal',
    adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'KSFM: Kentucky adopts IFC/IBC 2021 (KRS 227).',
      'KSFM: Electromagnetic locks require sensor release per IFC 1010.1.9.9.',
      'KSFM: Assembly occupancies (50+ persons) have additional egress hardware requirements.',
    ],
  },
  'Mississippi (MSFM/IBC)': {
    label: 'Mississippi (MSFM/IBC)',
    code: 'MSFM',
    authority: 'Mississippi State Fire Marshal',
    adoptedCodes: ['IBC 2021', 'IFC 2021', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: false,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'MSFM: Mississippi adopts IBC/IFC 2021 (MS Code 45-11).',
      'MSFM: Electromagnetic locks require sensor release per IFC 1010.1.9.9.',
      'MSFM: Local jurisdictions may have limited enforcement -- verify local AHJ.',
    ],
  },
  'North Carolina (NCOSFM/NC Building Code)': {
    label: 'North Carolina (NCOSFM/NC Building Code)',
    code: 'NCOSFM',
    authority: 'North Carolina Office of State Fire Marshal',
    adoptedCodes: ['NC Building Code (based on IBC 2021)', 'NC Fire Code (based on IFC)', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'NCOSFM: North Carolina adopts amended IBC/IFC as NC Building Code (NCGS 143-138).',
      'NCOSFM: Electromagnetic locks require listed sensor-release per NC Fire Code.',
      'NCOSFM: School security hardware must comply with NC Department of Public Instruction guidelines.',
    ],
  },
  'South Carolina (SCSFM/IFC)': {
    label: 'South Carolina (SCSFM/IFC)',
    code: 'SCSFM',
    authority: 'South Carolina State Fire Marshal',
    adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'SCSFM: South Carolina adopts IFC/IBC 2021 (SC Code 23-9).',
      'SCSFM: Electromagnetic locks require sensor release per IFC 1010.1.9.9.',
    ],
  },
  'Tennessee (TSFM/IFC)': {
    label: 'Tennessee (TSFM/IFC)',
    code: 'TSFM',
    authority: 'Tennessee State Fire Marshal',
    adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'TSFM: Tennessee adopts IFC/IBC 2021 (TCA 68-120).',
      'TSFM: Electromagnetic locks require sensor release per IFC 1010.1.9.9.',
      'TSFM: Metro Nashville and Memphis may have additional local amendments.',
    ],
  },
  'Virginia (VSFM/USBC)': {
    label: 'Virginia (VSFM/USBC)',
    code: 'VSFM',
    authority: 'Virginia State Fire Marshal / VA Uniform Statewide Building Code',
    adoptedCodes: ['USBC (based on IBC 2021)', 'SFPC (based on IFC)', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'VSFM: Virginia adopts USBC (Uniform Statewide Building Code) based on IBC/IFC 2021.',
      'VSFM: Electromagnetic locks require sensor release per USBC/SFPC.',
      'VSFM: Northern Virginia jurisdictions (Arlington, Fairfax) may have expedited review requirements.',
    ],
  },
  'West Virginia (WVSFM/IFC)': {
    label: 'West Virginia (WVSFM/IFC)',
    code: 'WVSFM',
    authority: 'West Virginia State Fire Marshal',
    adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: false,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'WVSFM: West Virginia adopts IFC/IBC 2021 (WV Code 29-3).',
      'WVSFM: Electromagnetic locks require sensor release per IFC 1010.1.9.9.',
    ],
  },

  // ===== EAST COAST STATES =====
  'Maine (MOSFM/NFPA 101)': {
    label: 'Maine (MOSFM/NFPA 101)',
    code: 'MOSFM',
    authority: 'Maine Office of State Fire Marshal',
    adoptedCodes: ['NFPA 101', 'NFPA 1', 'NFPA 80', 'MUBEC (Maine Uniform Building Code)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'MOSFM: Maine adopts NFPA 101 and NFPA 1 as primary fire codes.',
      'MOSFM: MUBEC (Maine Uniform Building and Energy Code) applies statewide.',
      'MOSFM: Electromagnetic locks require sensor release per NFPA 101 7.2.1.5.5.',
    ],
  },
  'New Hampshire (NHSFM/NFPA 101)': {
    label: 'New Hampshire (NHSFM/NFPA 101)',
    code: 'NHSFM',
    authority: 'New Hampshire State Fire Marshal',
    adoptedCodes: ['NFPA 101', 'NFPA 1', 'NFPA 80', 'NH Building Code (based on IBC)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'NHSFM: New Hampshire adopts NFPA 101 and NH State Building Code (RSA 155-A).',
      'NHSFM: Electromagnetic locks require sensor release per NFPA 101.',
    ],
  },
  'Vermont (VDFP/NFPA 101)': {
    label: 'Vermont (VDFP/NFPA 101)',
    code: 'VDFP',
    authority: 'Vermont Division of Fire Prevention',
    adoptedCodes: ['NFPA 101', 'NFPA 1', 'NFPA 80', 'VT Fire and Building Safety Code'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: false,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'VDFP: Vermont adopts NFPA 101 and Vermont Fire and Building Safety Code (20 VSA Chapter 173).',
      'VDFP: Electromagnetic locks require sensor release per NFPA 101.',
    ],
  },
  'Massachusetts (MSFM-MA/527 CMR)': {
    label: 'Massachusetts (MSFM-MA/527 CMR)',
    code: 'MSFM-MA',
    authority: 'Massachusetts State Fire Marshal / Department of Fire Services',
    adoptedCodes: ['527 CMR (MA Fire Code)', 'NFPA 101', 'NFPA 80', '780 CMR (MA Building Code based on IBC)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: true,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'MSFM-MA: Massachusetts adopts 527 CMR as fire prevention code with NFPA 101 references.',
      'MSFM-MA: Electromagnetic locks require PIR REX plus pneumatic push-to-exit per 527 CMR 10.00.',
      'MSFM-MA: Boston has additional local fire department requirements -- verify with BFD.',
      'MSFM-MA: All fire protection systems require Certificate of Competency technicians.',
    ],
  },
  'Rhode Island (RISFM/IFC)': {
    label: 'Rhode Island (RISFM/IFC)',
    code: 'RISFM',
    authority: 'Rhode Island State Fire Marshal',
    adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'RISFM: Rhode Island adopts IFC/IBC 2021 (RIGL 23-28.12).',
      'RISFM: Electromagnetic locks require sensor release per IFC 1010.1.9.9.',
      'RISFM: The Station nightclub fire (2003) resulted in strict assembly occupancy requirements.',
    ],
  },
  'Connecticut (CTSFM/CT Fire Safety Code)': {
    label: 'Connecticut (CTSFM/CT Fire Safety Code)',
    code: 'CTSFM',
    authority: 'Connecticut State Fire Marshal / DESPP',
    adoptedCodes: ['CT Fire Safety Code', 'NFPA 101', 'NFPA 80', 'CT State Building Code (based on IBC)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'CTSFM: Connecticut adopts CT Fire Safety Code referencing NFPA 101 (CGS 29-305).',
      'CTSFM: Electromagnetic locks require sensor release per CT Fire Safety Code.',
      'CTSFM: Licensed fire protection contractor required for all fire alarm system connections.',
    ],
  },
  'New York (NYSFM/NY Fire Code)': {
    label: 'New York (NYSFM/NY Fire Code)',
    code: 'NYSFM',
    authority: 'New York State Office of Fire Prevention and Control',
    adoptedCodes: ['NY Fire Code (based on IFC)', 'NY Building Code (based on IBC)', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: true,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'NYSFM: New York adopts Uniform Fire Prevention and Building Code (19 NYCRR Part 1200).',
      'NYSFM: Electromagnetic locks require PIR REX plus secondary manual release per NY Fire Code 1010.1.9.9.',
      'NYSFM: NYC has separate NYC Building Code and NYC Fire Code -- verify if project is in NYC.',
      'NYSFM: NYC Local Law 5 (1973) and subsequent amendments impose stricter egress requirements.',
    ],
  },
  'New Jersey (NJDCA/IFC)': {
    label: 'New Jersey (NJDCA/IFC)',
    code: 'NJDCA',
    authority: 'New Jersey Division of Fire Safety / DCA',
    adoptedCodes: ['NJ Uniform Construction Code (based on IBC)', 'IFC 2021', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'NJDCA: New Jersey adopts Uniform Construction Code (NJ UCC) with IFC references (NJSA 52:27D).',
      'NJDCA: Electromagnetic locks require sensor release per NJ UCC/IFC.',
      'NJDCA: Licensed locksmith required for commercial access control installations.',
    ],
  },
  'Pennsylvania (PASFM/IFC)': {
    label: 'Pennsylvania (PASFM/IFC)',
    code: 'PASFM',
    authority: 'Pennsylvania State Fire Marshal / L&I',
    adoptedCodes: ['PA UCC (based on IBC 2021)', 'IFC 2021', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'PASFM: Pennsylvania adopts PA Uniform Construction Code (34 PA Code Chapter 403).',
      'PASFM: Electromagnetic locks require sensor release per PA UCC/IFC.',
      'PASFM: Philadelphia has additional local amendments -- verify for Philadelphia projects.',
    ],
  },
  'Delaware (DSFM/IFC)': {
    label: 'Delaware (DSFM/IFC)',
    code: 'DSFM',
    authority: 'Delaware State Fire Marshal',
    adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'DSFM: Delaware adopts IFC/IBC 2021 with state amendments (Title 16, Chapter 66).',
      'DSFM: Delaware State Fire Marshal has sole jurisdiction over fire safety statewide.',
      'DSFM: Electromagnetic locks require sensor release per IFC 1010.1.9.9.',
    ],
  },
  'Maryland (MOSFM-MD/IFC)': {
    label: 'Maryland (MOSFM-MD/IFC)',
    code: 'MOSFM-MD',
    authority: 'Maryland Office of the State Fire Marshal',
    adoptedCodes: ['IFC 2021', 'IBC 2021', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'MOSFM-MD: Maryland adopts IFC/IBC 2021 (PS 6-301).',
      'MOSFM-MD: Electromagnetic locks require sensor release per IFC 1010.1.9.9.',
      'MOSFM-MD: Montgomery County and Prince George\'s County may have additional requirements.',
    ],
  },
  'Washington DC (DCFEMS/IFC)': {
    label: 'Washington DC (DCFEMS/IFC)',
    code: 'DCFEMS',
    authority: 'DC Fire and EMS / Department of Consumer and Regulatory Affairs',
    adoptedCodes: ['DC Construction Code (based on IBC)', 'IFC 2021', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: true,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'DCFEMS: DC adopts DC Construction Code with IFC/IBC references (12-A DCMR).',
      'DCFEMS: Electromagnetic locks require PIR REX plus secondary manual release.',
      'DCFEMS: Federal buildings (GSA) may have additional requirements beyond local code.',
      'DCFEMS: Historic preservation districts may restrict visible hardware modifications.',
    ],
  },

  // ===== CALIFORNIA =====
  'California (CSFM/CBC)': {
    label: 'California (CSFM/CBC)',
    code: 'CSFM',
    authority: 'California State Fire Marshal',
    adoptedCodes: ['CBC Title 24', 'CFC (based on IFC)', 'NFPA 80', 'NFPA 101 (referenced)'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: true,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: true,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'CSFM: California Building Code (CBC) Title 24 Part 2, Chapter 10 governs egress.',
      'CSFM: Electromagnetic locks require both motion sensor and irreversible action for release (CBC 1010.1.9.9).',
      'CSFM: All access control devices must be CSFM-listed (7170 series listings).',
      'CSFM: Hospital, school, and high-rise occupancies have additional requirements -- verify occupancy type.',
      'CSFM: Delayed egress locks limited to 15 seconds max with audible alarm (CBC 1010.1.9.8).',
    ],
  },

  // ===== GENERIC BASELINE =====
  'Generic (IBC/NFPA 101)': {
    label: 'Generic (IBC/NFPA 101)',
    code: 'IBC',
    authority: 'International Building Code / NFPA 101',
    adoptedCodes: ['IBC 2021', 'IFC 2021', 'NFPA 101', 'NFPA 80'],
    maglockRequiresPirRex: true,
    maglockRequiresPneumaticPte: false,
    fireRatedFailSafeRequired: true,
    fireRatedCloserRequired: true,
    facpTieInRequired: true,
    stairwellReIlluminationRequired: false,
    panicHardwareOnEgressDoors: true,
    additionalNotes: [
      'IBC: Generic baseline -- always verify local AHJ requirements.',
      'IBC: Electromagnetic locks require sensor release per IBC 1010.1.9.9.',
    ],
  },
};

export const STATE_KEYS = Object.keys(STATE_JURISDICTIONS);

// ===== Power Specs Database =====

export const POWER_SPECS: Record<string, Record<string, number>> = {
  Verkada: { AC42: 0.5, AC41: 0.4, 'TD52 Intercom': 0.45 },
  Brivo: { ACS6000: 0.6, ACS300: 0.3 },
  'Command Access': { 'ML1 Mortise': 0.15, 'LR Panic': 0.9 },
  Trine: { '3000 Strike': 0.24, '4800 Strike': 0.28 },
  HES: { '1006 Strike': 0.45, '9600 Surface': 0.45 },
  Avigilon: { 'Alta Reader': 0.2, 'Video Intercom': 0.6 },
  Aiphone: { 'IX-DV': 0.35, 'IXG-DM7': 0.5 },
};

export const CONTROLLER_BRANDS = ['Verkada', 'Brivo', 'Avigilon'];
export const LOCK_BRANDS = ['Command Access', 'Trine', 'HES'];

export const CONTROLLER_BRAND_MODELS: Record<string, string[]> = {
  Verkada: ['AC42', 'AC41'],
  Brivo: ['ACS6000', 'ACS300'],
  Avigilon: ['Alta_Reader'],
};

export const DOOR_TYPES = [
  'Standard Interior',
  'Fire-Rated',
  'Fire-Rated Stairwell',
  'Glass Storefront',
  'Emergency Exit',
] as const;

export const DOOR_TYPES_WITH_MANTRAP = [
  'Standard Interior',
  'Fire-Rated',
  'Fire-Rated Stairwell',
  'Glass Storefront',
  'Emergency Exit',
  'Mantrap',
] as const;

export const LOCK_TYPES = [
  'Electric Strike (Fail-Secure)',
  'Electric Strike (Fail-Safe)',
  'Maglock (Fail-Safe)',
  'Mortise Lock (Fail-Secure)',
  'Mortise Lock (Fail-Safe)',
  'Panic Hardware - Electric Latch Retraction',
  'Panic Hardware - Electrified Trim',
] as const;

export const REX_TYPES = [
  'PIR Motion Sensor',
  'Push Button',
  'Pneumatic Push-to-Exit Bar',
  'Touch Sense Bar',
] as const;

// ===== Door Build Calculation =====

export function calculateBuild(
  ctrlBrand: string,
  ctrlModel: string,
  doorType: string,
  lockBrand: string,
  lockModel: string,
  hasAdo: boolean,
  isMantrap: boolean,
  stateKey: string,
): BuildResult {
  const jurisdiction = STATE_JURISDICTIONS[stateKey];
  const ctrlDraw = POWER_SPECS[ctrlBrand]?.[ctrlModel] ?? 0.5;
  const lockDraw = POWER_SPECS[lockBrand]?.[lockModel] ?? 0.5;
  let totalDraw = ctrlDraw + lockDraw;
  if (isMantrap) totalDraw *= 2;

  const minPsu = totalDraw * 1.3;

  const wiringSchedule: { component: string; spec: WireSpec }[] = [
    { component: 'Reader (OSDP)', spec: { type: 'Shielded OSDP', gauge: '22 AWG', conductors: '4C' } },
    { component: 'Lock', spec: { type: 'Stranded', gauge: '18 AWG', conductors: '2C' } },
    { component: 'DPS / Status', spec: { type: 'Stranded', gauge: '22 AWG', conductors: '2C' } },
  ];

  if (hasAdo) {
    wiringSchedule.push({ component: 'Auto-Operator', spec: { type: 'Stranded', gauge: '18 AWG', conductors: '4C' } });
  }

  if (isMantrap) {
    wiringSchedule.push(
      { component: 'Door 2 Reader (OSDP)', spec: { type: 'Shielded OSDP', gauge: '22 AWG', conductors: '4C' } },
      { component: 'Door 2 Lock', spec: { type: 'Stranded', gauge: '18 AWG', conductors: '2C' } },
      { component: 'Door 2 DPS / Status', spec: { type: 'Stranded', gauge: '22 AWG', conductors: '2C' } },
    );
    if (hasAdo) {
      wiringSchedule.push({ component: 'Door 2 Auto-Operator', spec: { type: 'Stranded', gauge: '18 AWG', conductors: '4C' } });
    }
  }

  const violations: { code: string; message: string }[] = [];
  const recommendations: string[] = [];

  // ADA
  recommendations.push('ADA: Mount readers and actuators between 34" and 48" AFF.');

  // State-specific rules
  if (jurisdiction) {
    if (doorType.includes('Fire-Rated')) {
      if (jurisdiction.fireRatedFailSafeRequired) {
        recommendations.push(`${jurisdiction.code}: Fail-Safe hardware required on fire-rated doors. Must tie to FACP for automatic release on fire alarm.`);
      }
    }

    if (lockModel.toLowerCase().includes('maglock') || lockModel.toLowerCase().includes('mag')) {
      if (jurisdiction.maglockRequiresPirRex && jurisdiction.maglockRequiresPneumaticPte) {
        violations.push({
          code: jurisdiction.code,
          message: `Maglocks require PIR REX plus pneumatic push-to-exit for ${jurisdiction.authority} compliance.`,
        });
      } else if (jurisdiction.maglockRequiresPirRex) {
        violations.push({
          code: jurisdiction.code,
          message: `Maglocks require PIR REX sensor release for ${jurisdiction.authority} compliance.`,
        });
      }
    }

    if (isMantrap && jurisdiction.facpTieInRequired) {
      recommendations.push(`${jurisdiction.code}: Mantrap interlocks must drop all locks on fire alarm activation.`);
    }

    // State-specific additional notes
    for (const note of jurisdiction.additionalNotes) {
      if (!recommendations.includes(note)) {
        recommendations.push(note);
      }
    }
  }

  // Fire-rated general
  if (doorType.includes('Fire-Rated')) {
    recommendations.push('NFPA 80: Fire-rated doors require self-closing device. Verify door closer is installed.');
    recommendations.push('NFPA 101: Fail-Safe hardware ensures egress on power loss.');
  }

  if (hasAdo) {
    recommendations.push('ADA Integration: Use BEA Br3-X sequencer for latch-then-open timing with auto-operators.');
  }

  if (isMantrap) {
    recommendations.push('Interlock: Both doors must never be unlocked simultaneously. Interlock controller required.');
    recommendations.push('FACP: All locks must release on fire alarm (dry contact tie-in).');
  }

  recommendations.push('NDAA: Verify all access control hardware is SEC. 889 compliant. Check manufacturer certification.');

  return {
    state: stateKey,
    doorType,
    electrical: {
      controllerDraw: isMantrap ? ctrlDraw * 2 : ctrlDraw,
      lockDraw: isMantrap ? lockDraw * 2 : lockDraw,
      totalDraw,
      minPsu,
    },
    wiringSchedule,
    violations,
    recommendations,
  };
}

// ===== Compliance Audit Logic =====

export function runComplianceAudit(doorType: string, stateKey: string, hw: HardwareSet): AuditResult {
  const jurisdiction = STATE_JURISDICTIONS[stateKey];
  const violations: ComplianceViolation[] = [];
  const recommendations: string[] = [];
  let passCount = 0;
  let failCount = 0;

  // ADA Height Check
  recommendations.push('ADA: Mount readers and actuators between 34" and 48" AFF (Above Finished Floor).');
  passCount++;

  // REX Device Check
  if (!hw.hasRex) {
    violations.push({
      code: 'NFPA 101',
      message: 'Request-to-Exit (REX) device is required on all access-controlled doors for free egress.',
      severity: 'violation',
    });
    failCount++;
  } else {
    passCount++;
  }

  // DPS Check
  if (!hw.hasDps) {
    violations.push({
      code: 'BEST PRACTICE',
      message: 'Door Position Switch (DPS) not included. Forced-open and held-open alarms will not function.',
      severity: 'warning',
    });
    failCount++;
  } else {
    passCount++;
  }

  // Fire-Rated Door Rules
  const isFireRated = doorType.includes('Fire-Rated');
  if (isFireRated) {
    if (!hw.lockType.includes('Fail-Safe')) {
      const codeRef = jurisdiction ? `NFPA 101 / ${jurisdiction.code}` : 'NFPA 101';
      violations.push({
        code: codeRef,
        message: 'Fire-rated doors require Fail-Safe hardware. Lock must release on power loss to allow egress.',
        severity: 'violation',
      });
      failCount++;
    } else {
      passCount++;
    }

    if (!hw.hasCloser) {
      violations.push({
        code: 'NFPA 80',
        message: 'Fire-rated doors require a self-closing device (door closer). Frame integrity is compromised without one.',
        severity: 'violation',
      });
      failCount++;
    } else {
      passCount++;
    }

    recommendations.push('FACP Integration: Fail-Safe hardware on fire-rated doors must tie to the Fire Alarm Control Panel (FACP) for automatic release on alarm.');
  }

  // Emergency Exit Rules
  if (doorType === 'Emergency Exit') {
    if (hw.lockType.includes('Maglock')) {
      violations.push({
        code: 'NFPA 101',
        message: 'Maglocks on emergency exits require both PIR REX and a pneumatic push-to-exit device for code compliance.',
        severity: 'violation',
      });
      failCount++;

      if (hw.hasRex && hw.rexType !== 'PIR Motion Sensor') {
        violations.push({
          code: 'NFPA 101',
          message: 'REX type must be PIR Motion Sensor when using maglocks on emergency exits.',
          severity: 'warning',
        });
      }
    } else {
      passCount++;
    }
    recommendations.push('Emergency exits must provide unimpeded egress at all times per NFPA 101 Life Safety Code.');
  }

  // Maglock state-specific rules
  if (hw.lockType.includes('Maglock') && jurisdiction) {
    if (jurisdiction.maglockRequiresPneumaticPte) {
      violations.push({
        code: jurisdiction.code,
        message: `${jurisdiction.authority}: Maglocks require PIR REX plus pneumatic push-to-exit for compliance.`,
        severity: 'violation',
      });
      failCount++;
    } else if (jurisdiction.maglockRequiresPirRex) {
      if (hw.hasRex && hw.rexType !== 'PIR Motion Sensor') {
        violations.push({
          code: jurisdiction.code,
          message: `${jurisdiction.authority}: Maglocks require PIR Motion Sensor type REX.`,
          severity: 'warning',
        });
      }
    }
    recommendations.push('Maglocks are Fail-Safe by nature. Ensure backup power (UPS) if sustained locking is required during outages.');
  }

  // Mantrap Rules
  if (doorType === 'Mantrap') {
    recommendations.push('Mantrap interlock: Both doors must never be unlocked simultaneously. Interlock controller required.');
    if (jurisdiction?.facpTieInRequired) {
      recommendations.push(`${jurisdiction.code}/NFPA: Mantrap interlocks must drop all locks on Fire Alarm activation.`);
    }
  }

  // Glass Storefront Rules
  if (doorType === 'Glass Storefront') {
    if (hw.lockType.includes('Maglock')) {
      recommendations.push('Glass storefront maglocks: Verify maglock holding force is rated for the door weight. Header-mount preferred over surface mount.');
    }
    if (!hw.hasCloser) {
      recommendations.push('Glass storefront doors typically require a closer or floor spring for controlled operation.');
    }
  }

  // Panic Hardware Rules
  if (hw.lockType.includes('Panic Hardware')) {
    passCount++;
    recommendations.push('Panic hardware provides mechanical free egress. Electric latch retraction adds remote unlock capability.');
    if (hw.lockType.includes('Electric Latch Retraction')) {
      recommendations.push('ELR devices draw higher current (0.9A typical). Verify PSU capacity and wire gauge (18 AWG 2C minimum).');
    }
  }

  // Closer Check for Non-Fire-Rated
  if (!isFireRated && hw.hasCloser) {
    passCount++;
    recommendations.push('Door closer installed. Verify ADA compliance: closing time must be >= 5 seconds from 90 degrees to 12 degrees.');
  }

  // State-specific additional notes
  if (jurisdiction) {
    for (const note of jurisdiction.additionalNotes) {
      if (!recommendations.includes(note)) {
        recommendations.push(note);
      }
    }
  }

  // NDAA
  recommendations.push('NDAA: Verify all access control hardware is SEC. 889 compliant. Check manufacturer NDAA certification status.');

  return {
    doorType,
    state: stateKey,
    hardware: hw,
    violations,
    recommendations,
    passCount,
    failCount,
  };
}

// ===== Compliance Rules Upload/Import =====

export interface ComplianceRuleUpload {
  stateLabel: string;
  code: string;
  authority: string;
  adoptedCodes: string[];
  maglockRequiresPirRex: boolean;
  maglockRequiresPneumaticPte: boolean;
  fireRatedFailSafeRequired: boolean;
  fireRatedCloserRequired: boolean;
  facpTieInRequired: boolean;
  stairwellReIlluminationRequired: boolean;
  panicHardwareOnEgressDoors: boolean;
  additionalNotes: string[];
}

export function importComplianceRules(rules: ComplianceRuleUpload[]): { imported: number; errors: string[] } {
  const errors: string[] = [];
  let imported = 0;

  for (const rule of rules) {
    if (!rule.stateLabel || !rule.code || !rule.authority) {
      errors.push(`Skipped rule: missing stateLabel, code, or authority.`);
      continue;
    }
    const key = rule.stateLabel;
    STATE_JURISDICTIONS[key] = {
      label: rule.stateLabel,
      code: rule.code,
      authority: rule.authority,
      adoptedCodes: rule.adoptedCodes || [],
      maglockRequiresPirRex: rule.maglockRequiresPirRex ?? true,
      maglockRequiresPneumaticPte: rule.maglockRequiresPneumaticPte ?? false,
      fireRatedFailSafeRequired: rule.fireRatedFailSafeRequired ?? true,
      fireRatedCloserRequired: rule.fireRatedCloserRequired ?? true,
      facpTieInRequired: rule.facpTieInRequired ?? true,
      stairwellReIlluminationRequired: rule.stairwellReIlluminationRequired ?? false,
      panicHardwareOnEgressDoors: rule.panicHardwareOnEgressDoors ?? true,
      additionalNotes: rule.additionalNotes || [],
    };
    imported++;
  }

  return { imported, errors };
}

export function exportComplianceRules(): ComplianceRuleUpload[] {
  return Object.values(STATE_JURISDICTIONS).map((j) => ({
    stateLabel: j.label,
    code: j.code,
    authority: j.authority,
    adoptedCodes: j.adoptedCodes,
    maglockRequiresPirRex: j.maglockRequiresPirRex,
    maglockRequiresPneumaticPte: j.maglockRequiresPneumaticPte,
    fireRatedFailSafeRequired: j.fireRatedFailSafeRequired,
    fireRatedCloserRequired: j.fireRatedCloserRequired,
    facpTieInRequired: j.facpTieInRequired,
    stairwellReIlluminationRequired: j.stairwellReIlluminationRequired,
    panicHardwareOnEgressDoors: j.panicHardwareOnEgressDoors,
    additionalNotes: j.additionalNotes,
  }));
}
