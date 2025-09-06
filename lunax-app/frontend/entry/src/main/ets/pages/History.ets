import router from '@ohos.router';
import http from '@ohos.net.http';

@Entry
@Component
struct History {
  @State private periodRecords: Array<any> = [];
  @State private loading: boolean = true;
  @State private startDate: string = '';
  @State private endDate: string = '';

  aboutToAppear() {
    this.loadPeriodRecords();
  }

  async loadPeriodRecords() {
    this.loading = true;
    const httpRequest = http.createHttp();
    try {
      const response = await httpRequest.request(
        'https://your-api-domain.com/api/periods',
        {
          method: http.RequestMethod.GET,
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getToken()}`
          }
        }
      );

      if (response.responseCode === 200) {
        const data = JSON.parse(response.result.toString());
        this.periodRecords = data.data || [];
      }
    } catch (error) {
      console.error('加载记录失败:', error);
    } finally {
      this.loading = false;
    }
  }

  getToken(): string {
    // 实际项目中应该从本地存储获取
    return 'your-jwt-token';
  }

  formatDate(date: string): string {
    return date;
  }

  getFlowLevelText(level: string): string {
    switch (level) {
      case 'light': return '少量';
      case 'medium': return '中等';
      case 'heavy': return '大量';
      default: return '未知';
    }
  }

  build() {
    Column() {
      // Header
      Row() {
        Text('历史记录')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor('#E91E63')
        Blank()
        Text('返回')
          .fontSize(16)
          .fontColor('#2196F3')
          .onClick(() => {
            router.back();
          })
      }
      .width('100%')
      .padding(20)
      .backgroundColor('#FFF8E1')

      // Filter Controls
      Row() {
        Text('筛选:')
          .fontSize(14)
          .margin({ right: 10 })
        
        TextInput({ placeholder: '开始日期', text: this.startDate })
          .width('30%')
          .height(35)
          .onChange((value: string) => {
            this.startDate = value;
          })

        Text(' - ')
          .fontSize(14)
          .margin({ horizontal: 5 })

        TextInput({ placeholder: '结束日期', text: this.endDate })
          .width('30%')
          .height(35)
          .onChange((value: string) => {
            this.endDate = value;
          })

        Button('筛选')
          .height(35)
          .margin({ left: 10 })
          .onClick(() => {
            this.loadPeriodRecords();
          })
      }
      .width('100%')
      .padding(10)

      // Records List
      if (this.loading) {
        Column() {
          Text('加载中...')
            .fontSize(16)
            .fontColor('#666')
            .margin({ top: 50 })
        }
      } else if (this.periodRecords.length === 0) {
        Column() {
          Text('暂无记录')
            .fontSize(16)
            .fontColor('#666')
            .margin({ top: 50 })
          Text('点击"记录今天"开始记录您的生理期')
            .fontSize(14)
            .fontColor('#999')
            .margin({ top: 10 })
        }
      } else {
        List() {
          ForEach(this.periodRecords, (record) => {
            ListItem() {
              Card() {
                Column() {
                  Row() {
                    Text(this.formatDate(record.date))
                      .fontSize(16)
                      .fontWeight(FontWeight.Bold)
                      .fontColor('#E91E63')
                    Blank()
                    Text(this.getFlowLevelText(record.flowLevel))
                      .fontSize(14)
                      .fontColor('#666')
                  }
                  .width('100%')
                  .margin({ bottom: 8 })

                  if (record.symptoms && record.symptoms.length > 0) {
                    Row() {
                      Text('症状:')
                        .fontSize(14)
                        .fontColor('#666')
                        .margin({ right: 5 })
                      Text(record.symptoms.join(', '))
                        .fontSize(14)
                        .fontColor('#333')
                    }
                    .width('100%')
                    .margin({ bottom: 5 })
                  }

                  if (record.notes) {
                    Text(`备注: ${record.notes}`)
                      .fontSize(14)
                      .fontColor('#666')
                      .maxLines(2)
                      .textOverflow({ overflow: TextOverflow.Ellipsis })
                  }
                }
                .padding(15)
              }
              .width('100%')
              .margin({ bottom: 10 })
              .backgroundColor('#FFFFFF')
              .borderRadius(8)
              .shadow({ radius: 3, color: '#10000000' })
            }
          }, (record) => record.id)
        }
        .width('100%')
        .padding(10)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }
}