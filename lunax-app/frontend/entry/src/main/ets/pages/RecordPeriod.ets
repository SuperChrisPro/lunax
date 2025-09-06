import router from '@ohos.router';
import http from '@ohos.net.http';
import promptAction from '@ohos.promptAction';

@Entry
@Component
struct RecordPeriod {
  @State private selectedDate: string = '';
  @State private flowLevel: string = '中等';
  @State private symptoms: Array<string> = [];
  @State private notes: string = '';

  aboutToAppear() {
    this.selectedDate = this.formatDate(new Date());
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async savePeriodRecord() {
    if (!this.selectedDate) {
      promptAction.showToast({ message: '请选择日期' });
      return;
    }

    const recordData = {
      date: this.selectedDate,
      flowLevel: this.flowLevel,
      symptoms: this.symptoms,
      notes: this.notes
    };

    const httpRequest = http.createHttp();
    try {
      const response = await httpRequest.request(
        'https://your-api-domain.com/api/periods',
        {
          method: http.RequestMethod.POST,
          header: {
            'Content-Type': 'application/json'
          },
          extraData: recordData
        }
      );

      if (response.responseCode === 201) {
        promptAction.showToast({ message: '记录成功' });
        router.back();
      } else {
        promptAction.showToast({ message: '记录失败，请重试' });
      }
    } catch (error) {
      console.error('Failed to save period record:', error);
      promptAction.showToast({ message: '网络错误，请检查网络' });
    }
  }

  build() {
    Column() {
      // Header
      Row() {
        Text('记录生理期')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor('#E91E63')
      }
      .width('100%')
      .padding(20)
      .backgroundColor('#FFF8E1')

      // Date Selection
      Card() {
        Column() {
          Text('选择日期')
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .margin({ bottom: 10 })
          
          DatePicker({
            start: new Date('2020-01-01'),
            end: new Date('2030-12-31'),
            selected: new Date(this.selectedDate)
          })
            .onChange((value: Date) => {
              this.selectedDate = this.formatDate(value);
            })
        }
        .padding(20)
      }
      .width('90%')
      .margin({ top: 10 })
      .backgroundColor('#FFFFFF')
      .borderRadius(10)
      .shadow({ radius: 5, color: '#20000000' })

      // Flow Level
      Card() {
        Column() {
          Text('流量程度')
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .margin({ bottom: 10 })
          
          Row() {
            Radio({ value: '少量', group: 'flow' })
              .checked(this.flowLevel === '少量')
              .onChange((isChecked: boolean) => {
                if (isChecked) this.flowLevel = '少量';
              })
            Text('少量')
              .fontSize(14)
              .margin({ left: 5, right: 15 })

            Radio({ value: '中等', group: 'flow' })
              .checked(this.flowLevel === '中等')
              .onChange((isChecked: boolean) => {
                if (isChecked) this.flowLevel = '中等';
              })
            Text('中等')
              .fontSize(14)
              .margin({ left: 5, right: 15 })

            Radio({ value: '大量', group: 'flow' })
              .checked(this.flowLevel === '大量')
              .onChange((isChecked: boolean) => {
                if (isChecked) this.flowLevel = '大量';
              })
            Text('大量')
              .fontSize(14)
              .margin({ left: 5 })
          }
        }
        .padding(20)
      }
      .width('90%')
      .margin({ top: 10 })
      .backgroundColor('#FFFFFF')
      .borderRadius(10)
      .shadow({ radius: 5, color: '#20000000' })

      // Symptoms
      Card() {
        Column() {
          Text('症状记录')
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .margin({ bottom: 10 })
          
          Row() {
            Checkbox({ group: 'symptoms' })
              .onChange((isChecked: boolean) => {
                this.toggleSymptom('腹痛');
              })
            Text('腹痛')
              .fontSize(14)
              .margin({ left: 5, right: 15 })

            Checkbox({ group: 'symptoms' })
              .onChange((isChecked: boolean) => {
                this.toggleSymptom('腰酸');
              })
            Text('腰酸')
              .fontSize(14)
              .margin({ left: 5, right: 15 })

            Checkbox({ group: 'symptoms' })
              .onChange((isChecked: boolean) => {
                this.toggleSymptom('情绪波动');
              })
            Text('情绪波动')
              .fontSize(14)
              .margin({ left: 5 })
          }
        }
        .padding(20)
      }
      .width('90%')
      .margin({ top: 10 })
      .backgroundColor('#FFFFFF')
      .borderRadius(10)
      .shadow({ radius: 5, color: '#20000000' })

      // Notes
      Card() {
        Column() {
          Text('备注')
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .margin({ bottom: 10 })
          
          TextInput({ placeholder: '添加备注...', text: this.notes })
            .width('100%')
            .height(80)
            .onChange((value: string) => {
              this.notes = value;
            })
        }
        .padding(20)
      }
      .width('90%')
      .margin({ top: 10 })
      .backgroundColor('#FFFFFF')
      .borderRadius(10)
      .shadow({ radius: 5, color: '#20000000' })

      // Save Button
      Button('保存记录')
        .onClick(() => {
          this.savePeriodRecord();
        })
        .backgroundColor('#E91E63')
        .fontColor('#FFFFFF')
        .margin({ top: 20 })
        .width('80%')

      // Cancel Button
      Button('取消')
        .onClick(() => {
          router.back();
        })
        .backgroundColor('#9E9E9E')
        .fontColor('#FFFFFF')
        .margin({ top: 10 })
        .width('80%')
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }

  toggleSymptom(symptom: string) {
    const index = this.symptoms.indexOf(symptom);
    if (index > -1) {
      this.symptoms.splice(index, 1);
    } else {
      this.symptoms.push(symptom);
    }
  }
}