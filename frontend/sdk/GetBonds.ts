import axios from "axios";
import { BondReport } from '../../services/functions/bonds';

export type { BondReport };

export async function getBonds(): Promise<BondReport[]> {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/bonds`;
    return await (await axios.get(url)).data;
}