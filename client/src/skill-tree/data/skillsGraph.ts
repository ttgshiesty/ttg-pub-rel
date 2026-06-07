export {
  EXTRACTED_EDGES as SKILL_TREE_EDGES,
  EXTRACTED_SKILLS as POSITIONED_SKILLS,
  SKILL_TREE_VIEWBOX,
} from './extractedSkillTree';

import { EXTRACTED_SKILLS } from './extractedSkillTree';

export const getSkillsByTree = (tree: string) => {
  return EXTRACTED_SKILLS.filter((s) => s.tree === tree);
};

export const getSkillById = (id: string) => {
  return EXTRACTED_SKILLS.find((s) => s.id === id);
};
