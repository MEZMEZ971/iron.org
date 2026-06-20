import type { Locale } from "../locales";
import type { H5Key } from "./h5Overrides";

type NonBaseLocale = Exclude<Locale, "en" | "ar" | "it">;

export const H5_DEPOSIT_OVERRIDES: Record<
  NonBaseLocale,
  Partial<Record<H5Key, string>>
> = {
  ru: {
    h5DepositAmountLabel: "Введите сумму депозита (USDT)",
    h5DepositAmountPlaceholder: "Мин. 5 USDT",
    h5DepositConfirmGenerate: "Подтвердить и сгенерировать адрес",
    h5DepositGateNotice:
      "Введите сумму пополнения выше, чтобы получить безопасный канал депозита в сети.",
    h5DepositMinError: "Минимальная сумма депозита — 5 USDT",
  },
  de: {
    h5DepositAmountLabel: "Einzahlungsbetrag eingeben (USDT)",
    h5DepositAmountPlaceholder: "Min. 5 USDT",
    h5DepositConfirmGenerate: "Bestätigen & Adresse generieren",
    h5DepositGateNotice:
      "Geben Sie oben einen Einzahlungsbetrag ein, um einen sicheren Netzwerk-Einzahlungskanal anzufordern.",
    h5DepositMinError: "Mindesteinzahlung beträgt 5 USDT",
  },
  pt: {
    h5DepositAmountLabel: "Insira o valor do depósito (USDT)",
    h5DepositAmountPlaceholder: "Mín. 5 USDT",
    h5DepositConfirmGenerate: "Confirmar e gerar endereço",
    h5DepositGateNotice:
      "Insira um valor de recarga acima para solicitar um canal de depósito seguro na rede.",
    h5DepositMinError: "O depósito mínimo é 5 USDT",
  },
  es: {
    h5DepositAmountLabel: "Ingrese el monto del depósito (USDT)",
    h5DepositAmountPlaceholder: "Mín. 5 USDT",
    h5DepositConfirmGenerate: "Confirmar y generar dirección",
    h5DepositGateNotice:
      "Ingrese un monto de recarga arriba para solicitar un canal de depósito seguro en la red.",
    h5DepositMinError: "El depósito mínimo es 5 USDT",
  },
  fr: {
    h5DepositAmountLabel: "Saisir le montant du dépôt (USDT)",
    h5DepositAmountPlaceholder: "Min. 5 USDT",
    h5DepositConfirmGenerate: "Confirmer et générer l'adresse",
    h5DepositGateNotice:
      "Saisissez un montant de recharge ci-dessus pour demander un canal de dépôt sécurisé sur le réseau.",
    h5DepositMinError: "Le dépôt minimum est de 5 USDT",
  },
  ja: {
    h5DepositAmountLabel: "入金額を入力 (USDT)",
    h5DepositAmountPlaceholder: "最低 5 USDT",
    h5DepositConfirmGenerate: "確認してアドレスを生成",
    h5DepositGateNotice:
      "上記に入金額を入力すると、安全なネットワーク入金チャネルが生成されます。",
    h5DepositMinError: "最低入金額は 5 USDT です",
  },
  ko: {
    h5DepositAmountLabel: "입금 금액 입력 (USDT)",
    h5DepositAmountPlaceholder: "최소 5 USDT",
    h5DepositConfirmGenerate: "확인 및 주소 생성",
    h5DepositGateNotice:
      "위에 충전 금액을 입력하면 안전한 네트워크 입금 채널이 생성됩니다.",
    h5DepositMinError: "최소 입금액은 5 USDT입니다",
  },
  vi: {
    h5DepositAmountLabel: "Nhập số tiền nạp (USDT)",
    h5DepositAmountPlaceholder: "Tối thiểu 5 USDT",
    h5DepositConfirmGenerate: "Xác nhận & tạo địa chỉ",
    h5DepositGateNotice:
      "Vui lòng nhập số tiền nạp ở trên để yêu cầu kênh nạp an toàn trên mạng.",
    h5DepositMinError: "Số tiền nạp tối thiểu là 5 USDT",
  },
  fa: {
    h5DepositAmountLabel: "مبلغ واریز را وارد کنید (USDT)",
    h5DepositAmountPlaceholder: "حداقل ۵ USDT",
    h5DepositConfirmGenerate: "تأیید و تولید آدرس",
    h5DepositGateNotice:
      "لطفاً مبلغ شارژ را در بالا وارد کنید تا کانال واریز امن شبکه تولید شود.",
    h5DepositMinError: "حداقل مبلغ واریز ۵ USDT است",
  },
  id: {
    h5DepositAmountLabel: "Masukkan jumlah deposit (USDT)",
    h5DepositAmountPlaceholder: "Min. 5 USDT",
    h5DepositConfirmGenerate: "Konfirmasi & buat alamat",
    h5DepositGateNotice:
      "Masukkan jumlah isi ulang di atas untuk meminta saluran deposit jaringan yang aman.",
    h5DepositMinError: "Deposit minimum adalah 5 USDT",
  },
  bn: {
    h5DepositAmountLabel: "ডিপোজিট পরিমাণ লিখুন (USDT)",
    h5DepositAmountPlaceholder: "ন্যূন. ৫ USDT",
    h5DepositConfirmGenerate: "নিশ্চিত করুন ও ঠিকানা তৈরি করুন",
    h5DepositGateNotice:
      "নিরাপদ নেটওয়ার্ক ডিপোজিট চ্যানেলের জন্য উপরে ফান্ডিং পরিমাণ লিখুন।",
    h5DepositMinError: "ন্যূনতম ডিপোজিট ৫ USDT",
  },
  gn: {
    h5DepositAmountLabel: "Emoinge monto depósito (USDT)",
    h5DepositAmountPlaceholder: "Mín. 5 USDT",
    h5DepositConfirmGenerate: "Confirmar ha generar dirección",
    h5DepositGateNotice:
      "Emoinge peteĩ monto recarga yvate reguerekó hag̃ua peteĩ canal depósito seguro red-pe.",
    h5DepositMinError: "Depósito mínimo 5 USDT",
  },
  ay: {
    h5DepositAmountLabel: "Depósito qullqi qillqam (USDT)",
    h5DepositAmountPlaceholder: "Min. 5 USDT",
    h5DepositConfirmGenerate: "Confirmar & dirección uñstayaña",
    h5DepositGateNotice:
      "Aman qillqam recarga qullqi seguro red depósito canal mañatakix.",
    h5DepositMinError: "Depósito mínimo 5 USDT",
  },
  mi: {
    h5DepositAmountLabel: "Tāuruhia te moni whakatakoto (USDT)",
    h5DepositAmountPlaceholder: "Min. 5 USDT",
    h5DepositConfirmGenerate: "Whakapā & whakaputa wāhitau",
    h5DepositGateNotice:
      "Tāuruhia he moni whakatakoto ki runga hei tono hongere whakatakoto whatunga haumaru.",
    h5DepositMinError: "Te whakatakoto iti rawa he 5 USDT",
  },
  mn: {
    h5DepositAmountLabel: "Орлогын дүн оруулна уу (USDT)",
    h5DepositAmountPlaceholder: "Хамгийн багадаа 5 USDT",
    h5DepositConfirmGenerate: "Батлах & хаяг үүсгэх",
    h5DepositGateNotice:
      "Аюулгүй сүлжээний орлогын суваг авахын тулд дээр цэнэглэх дүнг оруулна уу.",
    h5DepositMinError: "Хамгийн бага орлого 5 USDT",
  },
};
