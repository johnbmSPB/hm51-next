import ConfirmationStatusPanel from "./ConfirmationStatusPanel";
import DataLabClient from "./DataLabClient";

export default function DataLabPage() {
  return (
    <>
      <DataLabClient />
      <ConfirmationStatusPanel />
    </>
  );
}
