import type { ProcessMode } from "../src/db/schema";

/** Source: roll-number list shared by the committee (authoritative spellings). */
export const MEMBERS: [name: string, roll: string, phone: string][] = [
  ["Devikaa Kumar", "B25015", "+91 99878 47819"],
  ["Prabhat Namdharani", "B25031", "+91 99875 40623"],
  ["Amal Francis", "B25061", "+91 90722 86986"],
  ["Saachi Talwar", "B25095", "+91 90419 60780"],
  ["Tejaswini Uma Sudhir", "B25104", "+91 63090 11008"],
  ["Aditya Guha", "B25114", "+91 90828 34125"],
  ["Anmol Saluja", "B25117", "+91 74128 82495"],
  ["Ashwani Kumar Singh", "B25120", "+91 93058 72298"],
  ["Mainak Chakraborty", "B25134", "+91 89614 29312"],
  ["Mrunmayi Patwardhan", "B25136", "+91 86001 80208"],
  ["Rahil Sudhesha", "B25144", "+91 79906 69696"],
  ["Rudransh Pratap Singh", "B25148", "+91 74080 92225"],
  ["Sanka Anjani", "B25150", "+91 87148 25785"],
  ["Vanshika Misra", "B25161", "+91 92355 09090"],
  ["Abinash Sahoo", "B25165", "+91 63701 01591"],
  ["Deepanshee", "B25175", "+91 99254 20841"],
  ["G Vamsidharan", "B25177", "+91 75981 58891"],
  ["Mudrika Singhal", "B25189", "+91 98083 81961"],
  ["Shobith Unnithan", "B25206", "+91 96068 68184"],
  ["Nilay Tamane", "B25217", "+91 91520 79282"],
  ["Rounak Dwary", "B25313", "+91 62037 44794"],
  ["Kishlay Kishore", "B25328", "+91 87897 31762"],
  ["Mahi Thakkar", "B25329", "+91 98243 47066"],
  ["Osman Baig", "B25330", "+91 70456 05240"],
  ["Vamika Gupta", "B25341", "+91 87508 57929"],
  ["Debashish Das", "B25348", "+91 90870 05337"],
  ["Shaurya", "B25374", "+91 90784 48522"],
  ["Chhavi Munjal", "B25384", "+91 86074 09023"],
  ["Kunal Verma", "B25386", "+91 97520 11133"],
  ["Snehashis Pattanayak", "B25393", "+91 98525 54103"],
  ["Shashwat Tripathi", "B25413", "+91 63931 78491"],
  ["Yash Kushwaha", "B25418", "+91 83038 91852"],
  ["Ishita Delish", "B25469", "+91 82815 39757"],
  ["Lavanya Krishan Sharma", "B25470", "+91 94662 90566"],
  ["Sarah Dhamija", "B25474", "+91 78149 80760"],
  ["Niharika Agarwal", "H25037", "+91 91089 74077"],
  ["Priyanka Biswas", "H25041", "+91 82922 42509"],
  ["Priyansh", "H25042", "+91 90346 06499"],
  ["Aaditya Govind Rao", "H25061", "+91 80049 12125"],
  ["Ahaan Vaidya", "H25066", "+91 93721 12791"],
  ["Aiswarya A T", "H25067", "+91 94960 63109"],
  ["Anchit Roy", "H25070", "+91 88221 50030"],
  ["Deepti Dekate", "H25080", "+91 70163 58860"],
  ["Karnpriya", "H25090", "+91 70078 32959"],
  ["Navya Ambardar", "H25096", "+91 96162 14999"],
  ["Prakrati Bhutra", "H25099", "+91 74330 23010"],
  ["Shubhangi", "H25109", "+91 74709 14264"],
  ["Bhamini Bachhas", "H25137", "+91 99115 07799"],
  ["Hanna Fathima", "H25146", "+91 91081 56559"],
  ["Kartik Chaudhary", "H25153", "+91 84390 99200"],
  ["Nehal Jajodia", "H25159", "+91 99036 26000"],
  ["Singuluri Jhanvi", "H25173", "+91 99891 82468"],
  ["Vanshika Rustagi", "H25178", "+91 88603 30910"],
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
