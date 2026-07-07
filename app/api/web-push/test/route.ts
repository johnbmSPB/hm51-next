import webpush from "web-push";

export const runtime = "nodejs";

type PushSubscriptionBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

function getEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing`);
  }

  return value;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const subscription = body.subscription as PushSubscriptionBody | undefined;

    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return Response.json(
        {
          result: false,
          error: "Push subscription не передан или передан не полностью",
        },
        { status: 400 }
      );
    }

    webpush.setVapidDetails(
      process.env.WEB_PUSH_SUBJECT || "mailto:office@codberry.ru",
      getEnv("NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY"),
      getEnv("WEB_PUSH_PRIVATE_KEY")
    );

    await webpush.sendNotification(
      subscription as any,
      JSON.stringify({
        title: body.title || "ХМ 5.1",
        body: body.body || "Тестовое уведомление Web Push на iPhone",
        data: {
          url: "/chat",
          type: "web_push_test",
        },
      })
    );

    return Response.json({
      result: true,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка отправки Web Push",
      },
      { status: 500 }
    );
  }
}
