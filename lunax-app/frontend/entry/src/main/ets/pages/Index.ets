import router from '@ohos.router';
import http from '@ohos.net.http';

@Entry
@Component
struct Index {
  @State private currentDate: string = '';
  @State private nextPeriodStart: string = '';
  @State private nextPeriodEnd: string = '';
  @State private accuracy: number = 0;
  @State private showCalendar: boolean = false;
  @State private periodHistory: Array<any> = [];

  aboutToAppear() {
    this.loadCurrentData();
  }

  loadCurrentData() {
    const today = new Date();
    this.currentDate = this.formatDate(today);
    this.fetchPredictionData();
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async fetchPredictionData() {
    const httpRequest = http.createHttp();
    try {
      const response = await httpRequest.request(
        'https://your-api-domain.com/api/prediction',
        {
          method: http.RequestMethod.GET,
          header: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.responseCode === 200) {
        const data = JSON.parse(response.result.toString());
        this.nextPeriodStart = data.nextPeriodStart;
        this.nextPeriodEnd = data.nextPeriodEnd;
        this.accuracy = data.accuracy;
      }
    } catch (error) {
      console.error('Failed to fetch prediction:', error);
    }
  }

  build() {
    Column() {
      // Header
      Row() {
        Text('月汐 LunaX')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor('#E91E63')
      }
      .width('100%')
      .padding(20)
      .backgroundColor('#FFF8E1')

      // Current Date Display
      Row() {
        Text(`今天: ${this.currentDate}`)
          .fontSize(16)
          .fontColor('#666')
      }
      .width('100%')
      .padding(10)

      // Prediction Card
      Card() {
        Column() {
          Text('下次生理期预测')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .margin({ bottom: 10 })
            .fontColor('#E91E63')

          Row() {
            Text('预计时间:')
              .fontSize(14)
              .fontColor('#666')
            Text(`${this.nextPeriodStart} - ${this.nextPeriodEnd}`)
              .fontSize(14)
              .fontWeight(FontWeight.Medium)
              .fontColor('#E91E63')
          }
          .margin({ bottom: 5 })

          Row() {
            Text('准确率:')
              .fontSize(14)
              .fontColor('#666')
            Text(`${this.accuracy}%`)
              .fontSize(14)
              .fontWeight(FontWeight.Medium)
              .fontColor('#4CAF50')
          }
        }
        .padding(20)
      }
      .width('90%')
      .margin({ top: 10, bottom: 10 })
      .backgroundColor('#FFFFFF')
      .borderRadius(10)
      .shadow({ radius: 5, color: '#20000000' })

      // Action Buttons
      Row() {
        Button('记录今天')
          .onClick(() => {
            router.pushUrl({
              url: 'pages/RecordPeriod'
            });
          })
          .backgroundColor('#E91E63')
          .fontColor('#FFFFFF')
          .margin({ right: 10 })

        Button('历史记录')
          .onClick(() => {
            router.pushUrl({
              url: 'pages/History'
            });
          })
          .backgroundColor('#FF9800')
          .fontColor('#FFFFFF')
      }
      .margin({ top: 20 })

      // Calendar View Toggle
      Button('查看日历')
        .onClick(() => {
          this.showCalendar = !this.showCalendar;
        })
        .backgroundColor('#2196F3')
        .fontColor('#FFFFFF')
        .margin({ top: 10 })

      // Simple Calendar (when toggled)
      if (this.showCalendar) {
        CalendarExample()
          .margin({ top: 20 })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }
}

@Component
struct CalendarExample {
  build() {
    Column() {
      Text('日历功能开发中...')
        .fontSize(16)
        .fontColor('#666')
    }
    .padding(20)
  }
}