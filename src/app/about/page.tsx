import Disclaimer from "@/components/disclaimer";

export default function AboutPage() {
  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col pt-8">
      <h1 className="text-xl font-bold text-skin">关于</h1>
      <p className="mb-6 text-xs text-skin-light">AI 肌肤管理助手</p>

      <div className="rounded-3xl bg-white p-5">
        <h2 className="mb-2 text-base font-semibold text-skin">我们的用途</h2>
        <p className="mb-4 text-sm leading-relaxed text-skin">
          帮助用户根据正脸照片的外观特征与简单问答，建立个人皮肤评估档案，并生成早晚护理流程与分阶段护肤计划。
        </p>
        <ul className="flex flex-col gap-2 text-sm text-skin">
          <li className="flex gap-2"><span className="text-blush">•</span> 照片仅在浏览器本地处理，不会上传</li>
          <li className="flex gap-2"><span className="text-blush">•</span> 分析基于外观特征参考，非医疗诊断</li>
          <li className="flex gap-2"><span className="text-blush">•</span> 护理建议为通用护肤逻辑，非处方</li>
        </ul>
      </div>

      <div className="mt-4 rounded-3xl bg-white p-5">
        <h2 className="mb-2 text-base font-semibold text-skin">重要提示</h2>
        <p className="text-sm leading-relaxed text-skin">
          如疑似皮肤疾病（红肿、破溃、持续瘙痒等）或用后有不适，请及时咨询专业皮肤科医生，本工具不作为诊断依据。
        </p>
      </div>

      <Disclaimer className="mt-4" />
    </div>
  );
}
