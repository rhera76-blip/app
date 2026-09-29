const isProduction = process.env.TRIPAY_MODE === 'production' || !process.env.TRIPAY_MODE;
    const baseUrl = isProduction 
      ? 'https://tripay.co.id/api' 
      : 'https://tripay.co.id/api-sandbox';

    const tripayUrl = `${baseUrl}/merchant/closed-transaction/create`;

    const tripayRes = await fetch(tripayUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tripayPayload)
    })

    const textRes = await tripayRes.text()
    let tripayData
    try {
      tripayData = JSON.parse(textRes)
    } catch {
      return fail(`Gagal mengurai respons dari TriPay: ${textRes.slice(0, 100)}`, 500)
    }

    if (!tripayData.success) {
      return fail(`Gagal membuat transaksi TriPay: ${tripayData.message || 'Unknown error'}`, 400)
    }
