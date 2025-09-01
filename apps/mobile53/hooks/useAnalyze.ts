import { useMutation } from "react-query";
import { analyze } from "../lib/api";

export function useAnalyze() {
    return useMutation(analyze);
}