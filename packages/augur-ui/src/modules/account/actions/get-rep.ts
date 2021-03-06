import logError from "utils/log-error";
import { NodeStyleCallback } from "modules/types";
import { getRep } from "modules/contracts/actions/contractCalls";

export default function(callback: NodeStyleCallback = logError) {
  return async () => {
    await getRep().catch((err: Error) => {
      console.log("error could not get rep", err);
      logError(new Error("get-Rep"));
    });
    callback(null);
  };
}
