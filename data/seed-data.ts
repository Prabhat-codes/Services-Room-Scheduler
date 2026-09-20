import type { ProcessMode } from "../src/db/schema";

/** Source: roll-number list shared by the committee (authoritative spellings). */
export const MEMBERS: [name: string, roll: string][] = [
  ["Devikaa Kumar", "B25015"],
  ["Prabhat Namdharani", "B25031"],
  ["Amal Francis", "B25061"],
  ["Saachi Talwar", "B25095"],
  ["Tejaswini Uma Sudhir", "B25104"],
  ["Aditya Guha", "B25114"],
  ["Anmol Saluja", "B25117"],
  ["Ashwani Kumar Singh", "B25120"],
  ["Mainak Chakraborty", "B25134"],
  ["Mrunmayi Patwardhan", "B25136"],
  ["Rahil Sudhesha", "B25144"],
  ["Rudransh Pratap Singh", "B25148"],
  ["Sanka Anjani", "B25150"],
  ["Vanshika Misra", "B25161"],
  ["Abinash Sahoo", "B25165"],
  ["Deepanshee", "B25175"],
  ["G Vamsidharan", "B25177"],
  ["Mudrika Singhal", "B25189"],
  ["Shobith Unnithan", "B25206"],
  ["Nilay Tamane", "B25217"],
  ["Rounak Dwary", "B25313"],
  ["Kishlay Kishore", "B25328"],
  ["Mahi Thakkar", "B25329"],
  ["Osman Baig", "B25330"],
  ["Vamika Gupta", "B25341"],
  ["Debashish Das", "B25348"],
  ["Shaurya", "B25374"],
  ["Chhavi Munjal", "B25384"],
  ["Kunal Verma", "B25386"],
  ["Snehashis Pattanayak", "B25393"],
  ["Shashwat Tripathi", "B25413"],
  ["Yash Kushwaha", "B25418"],
  ["Ishita Delish", "B25469"],
  ["Lavanya Krishan Sharma", "B25470"],
  ["Sarah Dhamija", "B25474"],
  ["Niharika Agarwal", "H25037"],
  ["Priyanka Biswas", "H25041"],
  ["Priyansh", "H25042"],
  ["Aaditya Govind Rao", "H25061"],
  ["Ahaan Vaidya", "H25066"],
  ["Aiswarya A T", "H25067"],
  ["Anchit Roy", "H25070"],
  ["Deepti Dekate", "H25080"],
  ["Karnpriya", "H25090"],
  ["Navya Ambardar", "H25096"],
  ["Prakrati Bhutra", "H25099"],
  ["Shubhangi", "H25109"],
  ["Bhamini Bachhas", "H25137"],
  ["Hanna Fathima", "H25146"],
  ["Kartik Chaudhary", "H25153"],
  ["Nehal Jajodia", "H25159"],
  ["Singuluri Jhanvi", "H25173"],
  ["Vanshika Rustagi", "H25178"],
];

/** Source: Member_List.docx room allocation. "Group" is treated as a floor. */
export const BUILDINGS: { name: string; floors: { floor: string; rooms: string[] }[] }[] = [
  {
    name: "LC2",
    floors: [
      { floor: "Floor 1", rooms: ["11", "12", "13", "14", "15", "16", "17"] },
      { floor: "Floor 2", rooms: ["21", "22", "23", "24", "25"] },
      { floor: "Floor 3", rooms: ["31", "32", "33", "34", "35", "36"] },
    ],
  },
  {
    name: "IC",
    floors: [
      { floor: "Floor 1", rooms: ["100", "101", "102", "103", "104", "105"] },
      { floor: "Floor 2", rooms: ["201", "202", "203", "204"] },
    ],
  },
];

export const TRAY = "Recruiter's tray";
const ALL: ProcessMode[] = ["offline", "online", "hybrid"];
const AV: ProcessMode[] = ["online", "hybrid"];

/** Source: Member_List.docx room requirements. `modes` = auto-selected for those process modes. */
export const PRESETS: { label: string; group: string | null; modes: ProcessMode[] }[] = [
  { label: "Table", group: null, modes: ALL },
  { label: "Chair", group: null, modes: ALL },
  { label: "Dustbin", group: null, modes: ALL },
  { label: "Water", group: null, modes: ALL },
  { label: "Refreshment", group: null, modes: ALL },
  { label: "Glasses", group: null, modes: ALL },
  { label: "Cups", group: null, modes: ALL },
  { label: "Mic", group: null, modes: AV },
  { label: "Screen", group: null, modes: AV },
  { label: "Projector", group: null, modes: AV },
  { label: "Sofa", group: null, modes: [] },
  ...[
    "Notepad",
    "Writing pad",
    "Pen",
    "Pencil",
    "Eraser",
    "Scale",
    "Sticky notes",
    "Tissue paper",
    "Paper clip",
    "Highlighter",
    "Marker",
  ].map((label) => ({ label, group: TRAY, modes: ALL })),
];
