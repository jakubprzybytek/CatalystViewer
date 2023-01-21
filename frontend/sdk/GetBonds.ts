import axios from "axios";
import { BondReport, BondDetails, BondCurrentValues } from '../../services/api/bonds';

export type { BondReport, BondDetails, BondCurrentValues };

export async function getBonds(): Promise<BondReport[]> {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/bonds`;
    return (await axios.get<BondReport[]>(url)).data;
}