import { Wrench } from "lucide-react";

export default function Maintenance() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-6">
        <Wrench className="w-8 h-8 text-yellow-600" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Đang bảo trì</h1>
      <p className="text-slate-500 max-w-sm">
        Website đang trong quá trình bảo trì. Vui lòng quay lại sau.
      </p>
    </div>
  );
}
