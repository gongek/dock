import { createPolicyDocumentHandlers } from "@/lib/policies/createPolicyDocumentHandlers";
import {
  DOCK_POLICY_DOCUMENTS,
  getDockPolicyDocument,
} from "@/lib/policies/dockPolicyRegistry";

const handlers = createPolicyDocumentHandlers(
  DOCK_POLICY_DOCUMENTS,
  getDockPolicyDocument,
);

export const generateStaticParams = handlers.generateStaticParams;
export const generateMetadata = handlers.generateMetadata;
export default handlers.PolicyDocumentPage;
