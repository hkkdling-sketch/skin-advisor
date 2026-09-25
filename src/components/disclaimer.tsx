export default function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <section
      className={`rounded-2xl bg-cream-deep/60 p-4 text-[12px] leading-relaxed text-skin ${className}`}
    >
      <p className="mb-1 font-semibold text-skin">免责声明</p>
      <p>
        本产品为「AI 皮肤护理管理」参考工具，分析基于照片外观特征，仅供日常护肤参考，不构成医疗诊断、处方或治疗建议。如疑似皮肤疾病、出现严重症状或需用药，请咨询专业皮肤科医生。
      </p>
    </section>
  );
}
